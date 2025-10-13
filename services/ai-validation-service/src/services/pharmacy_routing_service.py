"""
Pharmacy Network and Routing Service
Manages pharmacy connections, routing logic, and Surescripts integration
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import logging
import requests
from geopy.distance import geodesic
import json

logger = logging.getLogger(__name__)


class PharmacyNetwork(Enum):
    """Pharmacy network types"""
    SURESCRIPTS = "surescripts"
    DIRECT = "direct"
    RETAIL_CHAIN = "retail_chain"
    MAIL_ORDER = "mail_order"
    SPECIALTY = "specialty"


class PharmacyStatus(Enum):
    """Pharmacy operational status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    CLOSED = "closed"


@dataclass
class PharmacyProfile:
    """Complete pharmacy profile"""
    ncpdp_id: str
    npi: Optional[str]
    name: str
    network: PharmacyNetwork
    status: PharmacyStatus
    address_line1: str
    city: str
    state: str
    zip_code: str
    latitude: float
    longitude: float
    phone: str
    fax: Optional[str]
    email: Optional[str]
    hours: Dict[str, str]  # Day of week -> hours string
    accepts_eprescribe: bool
    accepts_controlled: bool
    specialty_services: List[str]
    preferred_by_plans: List[str]  # Insurance plan IDs
    average_wait_time: int  # minutes
    rating: float  # 0-5
    last_successful_transmission: Optional[datetime]


@dataclass
class RoutingPreferences:
    """Patient routing preferences"""
    preferred_pharmacy_id: Optional[str]
    max_distance_miles: float
    preferred_networks: List[PharmacyNetwork]
    require_24_hour: bool
    require_drive_through: bool
    insurance_plan_id: Optional[str]


class PharmacyDirectory:
    """
    Manages pharmacy directory and lookups
    """
    
    def __init__(self):
        self.pharmacies: Dict[str, PharmacyProfile] = {}
        self._load_pharmacy_data()
    
    def _load_pharmacy_data(self):
        """Load pharmacy directory from database"""
        # In production, load from database
        # For now, add sample pharmacies
        sample_pharmacies = [
            PharmacyProfile(
                ncpdp_id="1234567",
                npi="9876543210",
                name="CVS Pharmacy #1234",
                network=PharmacyNetwork.RETAIL_CHAIN,
                status=PharmacyStatus.ACTIVE,
                address_line1="123 Main St",
                city="Boston",
                state="MA",
                zip_code="02101",
                latitude=42.3601,
                longitude=-71.0589,
                phone="5551234567",
                fax="5551234568",
                email="pharmacy1234@cvs.com",
                hours={
                    "Monday": "8:00 AM - 10:00 PM",
                    "Tuesday": "8:00 AM - 10:00 PM",
                    "Wednesday": "8:00 AM - 10:00 PM",
                    "Thursday": "8:00 AM - 10:00 PM",
                    "Friday": "8:00 AM - 10:00 PM",
                    "Saturday": "9:00 AM - 6:00 PM",
                    "Sunday": "10:00 AM - 6:00 PM"
                },
                accepts_eprescribe=True,
                accepts_controlled=True,
                specialty_services=["immunizations", "compounding"],
                preferred_by_plans=["BCBS", "AETNA"],
                average_wait_time=15,
                rating=4.2,
                last_successful_transmission=datetime.utcnow()
            ),
            PharmacyProfile(
                ncpdp_id="2345678",
                npi="8765432109",
                name="Walgreens #5678",
                network=PharmacyNetwork.RETAIL_CHAIN,
                status=PharmacyStatus.ACTIVE,
                address_line1="456 Market St",
                city="Boston",
                state="MA",
                zip_code="02102",
                latitude=42.3551,
                longitude=-71.0603,
                phone="5552345678",
                fax="5552345679",
                email="pharmacy5678@walgreens.com",
                hours={
                    "Monday": "24 hours",
                    "Tuesday": "24 hours",
                    "Wednesday": "24 hours",
                    "Thursday": "24 hours",
                    "Friday": "24 hours",
                    "Saturday": "24 hours",
                    "Sunday": "24 hours"
                },
                accepts_eprescribe=True,
                accepts_controlled=True,
                specialty_services=["immunizations", "drive-through"],
                preferred_by_plans=["BCBS", "CIGNA", "UNITED"],
                average_wait_time=20,
                rating=4.5,
                last_successful_transmission=datetime.utcnow()
            )
        ]
        
        for pharmacy in sample_pharmacies:
            self.pharmacies[pharmacy.ncpdp_id] = pharmacy
        
        logger.info(f"Loaded {len(self.pharmacies)} pharmacies")
    
    def get_pharmacy(self, ncpdp_id: str) -> Optional[PharmacyProfile]:
        """Get pharmacy by NCPDP ID"""
        return self.pharmacies.get(ncpdp_id)
    
    def search_pharmacies(
        self,
        latitude: float,
        longitude: float,
        radius_miles: float = 10.0,
        filters: Optional[Dict] = None
    ) -> List[Tuple[PharmacyProfile, float]]:
        """
        Search pharmacies by location
        
        Args:
            latitude: Search center latitude
            longitude: Search center longitude
            radius_miles: Search radius in miles
            filters: Additional filters
        
        Returns:
            List of (pharmacy, distance) tuples sorted by distance
        """
        results = []
        center = (latitude, longitude)
        
        for pharmacy in self.pharmacies.values():
            # Skip inactive pharmacies
            if pharmacy.status != PharmacyStatus.ACTIVE:
                continue
            
            # Calculate distance
            pharmacy_location = (pharmacy.latitude, pharmacy.longitude)
            distance = geodesic(center, pharmacy_location).miles
            
            # Check radius
            if distance > radius_miles:
                continue
            
            # Apply filters
            if filters:
                if filters.get("network") and pharmacy.network not in filters["network"]:
                    continue
                
                if filters.get("accepts_eprescribe") and not pharmacy.accepts_eprescribe:
                    continue
                
                if filters.get("accepts_controlled") and not pharmacy.accepts_controlled:
                    continue
                
                if filters.get("24_hour") and "24 hours" not in pharmacy.hours.get("Monday", ""):
                    continue
            
            results.append((pharmacy, distance))
        
        # Sort by distance
        results.sort(key=lambda x: x[1])
        
        logger.info(f"Found {len(results)} pharmacies within {radius_miles} miles")
        
        return results
    
    def get_pharmacy_availability(self, ncpdp_id: str) -> Dict:
        """
        Check pharmacy availability and wait times
        
        Args:
            ncpdp_id: Pharmacy NCPDP ID
        
        Returns:
            Availability information
        """
        pharmacy = self.get_pharmacy(ncpdp_id)
        
        if not pharmacy:
            return {"available": False, "reason": "Pharmacy not found"}
        
        if pharmacy.status != PharmacyStatus.ACTIVE:
            return {"available": False, "reason": f"Pharmacy status: {pharmacy.status.value}"}
        
        # Check if currently open
        now = datetime.now()
        day_of_week = now.strftime("%A")
        hours = pharmacy.hours.get(day_of_week, "")
        
        is_open = self._check_if_open(hours, now.time())
        
        return {
            "available": is_open,
            "pharmacy_name": pharmacy.name,
            "hours_today": hours,
            "average_wait_time": pharmacy.average_wait_time,
            "accepts_eprescribe": pharmacy.accepts_eprescribe,
            "accepts_controlled": pharmacy.accepts_controlled,
            "current_time": now.isoformat()
        }
    
    @staticmethod
    def _check_if_open(hours_string: str, current_time) -> bool:
        """Check if pharmacy is currently open"""
        if "24 hours" in hours_string.lower():
            return True
        
        # Parse hours (simplified)
        # In production, use proper time parsing
        return True  # Placeholder


class PharmacyRouter:
    """
    Routes prescriptions to optimal pharmacy
    """
    
    def __init__(self, directory: PharmacyDirectory):
        self.directory = directory
    
    def route_prescription(
        self,
        patient_location: Tuple[float, float],
        preferences: RoutingPreferences,
        prescription_type: str = "standard"
    ) -> List[Dict]:
        """
        Route prescription to best pharmacy options
        
        Args:
            patient_location: (latitude, longitude)
            preferences: Patient routing preferences
            prescription_type: standard, controlled, specialty
        
        Returns:
            List of ranked pharmacy options
        """
        # Step 1: Check preferred pharmacy
        if preferences.preferred_pharmacy_id:
            preferred = self.directory.get_pharmacy(preferences.preferred_pharmacy_id)
            
            if preferred and preferred.status == PharmacyStatus.ACTIVE:
                distance = geodesic(
                    patient_location,
                    (preferred.latitude, preferred.longitude)
                ).miles
                
                if distance <= preferences.max_distance_miles:
                    # Preferred pharmacy is available
                    return [self._create_route_option(preferred, distance, rank=1, reason="Preferred pharmacy")]
        
        # Step 2: Search nearby pharmacies
        filters = {
            "accepts_eprescribe": True,
            "network": preferences.preferred_networks if preferences.preferred_networks else None,
            "24_hour": preferences.require_24_hour
        }
        
        # Add prescription type requirements
        if prescription_type == "controlled":
            filters["accepts_controlled"] = True
        
        nearby_pharmacies = self.directory.search_pharmacies(
            latitude=patient_location[0],
            longitude=patient_location[1],
            radius_miles=preferences.max_distance_miles,
            filters=filters
        )
        
        # Step 3: Rank pharmacies
        ranked_options = []
        
        for rank, (pharmacy, distance) in enumerate(nearby_pharmacies[:10], start=1):
            option = self._create_route_option(pharmacy, distance, rank)
            ranked_options.append(option)
        
        logger.info(f"Generated {len(ranked_options)} routing options")
        
        return ranked_options
    
    def _create_route_option(
        self,
        pharmacy: PharmacyProfile,
        distance: float,
        rank: int,
        reason: str = "Location-based"
    ) -> Dict:
        """Create routing option dictionary"""
        return {
            "rank": rank,
            "ncpdp_id": pharmacy.ncpdp_id,
            "pharmacy_name": pharmacy.name,
            "network": pharmacy.network.value,
            "address": f"{pharmacy.address_line1}, {pharmacy.city}, {pharmacy.state} {pharmacy.zip_code}",
            "phone": pharmacy.phone,
            "distance_miles": round(distance, 2),
            "estimated_wait_time": pharmacy.average_wait_time,
            "rating": pharmacy.rating,
            "accepts_eprescribe": pharmacy.accepts_eprescribe,
            "specialty_services": pharmacy.specialty_services,
            "routing_reason": reason,
            "confidence_score": self._calculate_confidence(pharmacy, distance)
        }
    
    @staticmethod
    def _calculate_confidence(pharmacy: PharmacyProfile, distance: float) -> float:
        """Calculate routing confidence score"""
        score = 100.0
        
        # Distance penalty (0-30 points)
        if distance > 10:
            score -= min(30, (distance - 10) * 2)
        
        # Wait time penalty (0-20 points)
        if pharmacy.average_wait_time > 30:
            score -= min(20, (pharmacy.average_wait_time - 30))
        
        # Rating bonus (0-10 points)
        score += (pharmacy.rating - 3.0) * 5
        
        # Last transmission check (0-10 points)
        if pharmacy.last_successful_transmission:
            hours_since_last = (
                datetime.utcnow() - pharmacy.last_successful_transmission
            ).total_seconds() / 3600
            
            if hours_since_last > 24:
                score -= 10
        
        return max(0, min(100, score))


class SurescriptsConnector:
    """
    Connects to Surescripts network for e-prescribing
    """
    
    def __init__(
        self,
        api_url: str,
        client_id: str,
        client_secret: str,
        cert_path: str,
        key_path: str
    ):
        """
        Initialize Surescripts connector
        
        Args:
            api_url: Surescripts API endpoint
            client_id: Client ID
            client_secret: Client secret
            cert_path: Path to client certificate
            key_path: Path to private key
        """
        self.api_url = api_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.cert = (cert_path, key_path)
        self.session = requests.Session()
    
    def send_prescription(
        self,
        ncpdp_script_xml: str,
        pharmacy_ncpdp_id: str
    ) -> Dict:
        """
        Send prescription via Surescripts
        
        Args:
            ncpdp_script_xml: NCPDP SCRIPT XML message
            pharmacy_ncpdp_id: Target pharmacy NCPDP ID
        
        Returns:
            Transmission result
        """
        try:
            # Prepare request
            headers = {
                "Content-Type": "application/xml",
                "Authorization": f"Bearer {self._get_access_token()}",
                "X-Pharmacy-NCPDP": pharmacy_ncpdp_id
            }
            
            # Send to Surescripts
            response = self.session.post(
                f"{self.api_url}/messages/send",
                data=ncpdp_script_xml,
                headers=headers,
                cert=self.cert,
                timeout=30
            )
            
            response.raise_for_status()
            
            result = {
                "success": True,
                "transmission_id": response.headers.get("X-Transmission-ID"),
                "pharmacy_ncpdp_id": pharmacy_ncpdp_id,
                "timestamp": datetime.utcnow().isoformat(),
                "status": "transmitted"
            }
            
            logger.info(
                f"Successfully transmitted prescription to pharmacy {pharmacy_ncpdp_id}"
            )
            
            return result
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to transmit prescription: {e}")
            
            return {
                "success": False,
                "error": str(e),
                "pharmacy_ncpdp_id": pharmacy_ncpdp_id,
                "timestamp": datetime.utcnow().isoformat(),
                "status": "failed"
            }
    
    def check_status(self, transmission_id: str) -> Dict:
        """
        Check prescription transmission status
        
        Args:
            transmission_id: Transmission ID
        
        Returns:
            Status information
        """
        try:
            headers = {
                "Authorization": f"Bearer {self._get_access_token()}"
            }
            
            response = self.session.get(
                f"{self.api_url}/messages/{transmission_id}/status",
                headers=headers,
                cert=self.cert,
                timeout=10
            )
            
            response.raise_for_status()
            
            return response.json()
        
        except Exception as e:
            logger.error(f"Failed to check transmission status: {e}")
            return {"status": "unknown", "error": str(e)}
    
    def _get_access_token(self) -> str:
        """Get OAuth2 access token"""
        # In production, implement proper OAuth2 flow
        # For now, return placeholder
        return "SURESCRIPTS_ACCESS_TOKEN"


class PrescriptionTransmissionService:
    """
    Manages prescription transmission with retry logic
    """
    
    def __init__(
        self,
        router: PharmacyRouter,
        connector: SurescriptsConnector
    ):
        self.router = router
        self.connector = connector
        self.transmission_log = []
    
    def transmit_prescription(
        self,
        prescription_xml: str,
        patient_location: Tuple[float, float],
        preferences: RoutingPreferences,
        max_retries: int = 3
    ) -> Dict:
        """
        Transmit prescription with automatic routing and retry
        
        Args:
            prescription_xml: NCPDP SCRIPT XML
            patient_location: Patient location
            preferences: Routing preferences
            max_retries: Maximum retry attempts
        
        Returns:
            Transmission result
        """
        # Get routing options
        routing_options = self.router.route_prescription(
            patient_location=patient_location,
            preferences=preferences
        )
        
        if not routing_options:
            return {
                "success": False,
                "error": "No pharmacies available",
                "timestamp": datetime.utcnow().isoformat()
            }
        
        # Attempt transmission with retry
        for attempt in range(max_retries):
            for option in routing_options:
                pharmacy_id = option["ncpdp_id"]
                
                logger.info(
                    f"Transmitting prescription to {option['pharmacy_name']} "
                    f"(attempt {attempt + 1}/{max_retries})"
                )
                
                result = self.connector.send_prescription(
                    ncpdp_script_xml=prescription_xml,
                    pharmacy_ncpdp_id=pharmacy_id
                )
                
                # Log transmission
                self.transmission_log.append({
                    "pharmacy_ncpdp_id": pharmacy_id,
                    "pharmacy_name": option["pharmacy_name"],
                    "attempt": attempt + 1,
                    "result": result,
                    "timestamp": datetime.utcnow().isoformat()
                })
                
                if result["success"]:
                    return {
                        "success": True,
                        "pharmacy": option,
                        "transmission_id": result["transmission_id"],
                        "attempts": attempt + 1,
                        "timestamp": datetime.utcnow().isoformat()
                    }
            
            # Wait before retry
            if attempt < max_retries - 1:
                import time
                time.sleep(5 * (attempt + 1))  # Exponential backoff
        
        # All attempts failed
        return {
            "success": False,
            "error": "All transmission attempts failed",
            "attempts": max_retries,
            "routing_options_tried": len(routing_options),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_transmission_history(self, limit: int = 100) -> List[Dict]:
        """Get recent transmission history"""
        return self.transmission_log[-limit:]


# Example usage
if __name__ == "__main__":
    # Initialize services
    directory = PharmacyDirectory()
    router = PharmacyRouter(directory)
    
    # Search pharmacies
    boston_location = (42.3601, -71.0589)
    
    preferences = RoutingPreferences(
        preferred_pharmacy_id=None,
        max_distance_miles=5.0,
        preferred_networks=[PharmacyNetwork.RETAIL_CHAIN],
        require_24_hour=False,
        require_drive_through=False,
        insurance_plan_id="BCBS"
    )
    
    # Route prescription
    options = router.route_prescription(
        patient_location=boston_location,
        preferences=preferences
    )
    
    print(f"Found {len(options)} pharmacy options:")
    for option in options:
        print(f"\n{option['rank']}. {option['pharmacy_name']}")
        print(f"   Distance: {option['distance_miles']} miles")
        print(f"   Wait time: {option['estimated_wait_time']} minutes")
        print(f"   Rating: {option['rating']}/5.0")
        print(f"   Confidence: {option['confidence_score']:.1f}%")