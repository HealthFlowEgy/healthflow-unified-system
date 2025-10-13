"""
NCPDP SCRIPT E-Prescribing Service
Implements NCPDP SCRIPT 2017071 standard for electronic prescribing
Supports NewRx, RxChange, RxFill, Status, and Error messages
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
import xml.etree.ElementTree as ET
import logging
import uuid

logger = logging.getLogger(__name__)


class MessageType(Enum):
    """NCPDP SCRIPT message types"""
    NEWRX = "NEWRX"  # New prescription
    RXCHANGE = "RXCHANGE"  # Prescription change request
    RXFILL = "RXFILL"  # Fill notification
    STATUS = "STATUS"  # Status message
    ERROR = "ERROR"  # Error message
    VERIFY = "VERIFY"  # Prescription verification
    CANCEL = "CANCEL"  # Cancel prescription
    REFILL_REQUEST = "REFILLREQUEST"  # Refill request
    REFILL_RESPONSE = "REFILLRESPONSE"  # Refill response


class PrescriptionStatus(Enum):
    """Prescription status codes"""
    PENDING = "000"  # Pending
    TRANSMITTED = "010"  # Transmitted to pharmacy
    RECEIVED = "020"  # Received by pharmacy
    IN_PROCESS = "030"  # Being processed
    READY = "040"  # Ready for pickup
    PICKED_UP = "050"  # Picked up by patient
    CANCELLED = "060"  # Cancelled
    ERROR = "900"  # Error


@dataclass
class Prescriber:
    """Prescriber information"""
    npi: str
    dea: Optional[str]
    state_license: Optional[str]
    first_name: str
    last_name: str
    phone: str
    fax: Optional[str]
    address_line1: str
    city: str
    state: str
    zip_code: str
    email: Optional[str]


@dataclass
class Patient:
    """Patient information"""
    first_name: str
    last_name: str
    dob: str  # CCYYMMDD format
    gender: str  # M, F, U
    address_line1: str
    city: str
    state: str
    zip_code: str
    phone: str
    email: Optional[str]


@dataclass
class Medication:
    """Medication information"""
    drug_description: str
    drug_coded: str  # NDC or compound code
    quantity: float
    quantity_qualifier: str  # C38288 (each), C48155 (ml), etc.
    days_supply: int
    refills: int
    substitutions: str  # 0=No substitution, 1=Substitution allowed
    sig: str  # Directions
    note: Optional[str]
    diagnosis: Optional[str]  # ICD-10 code


@dataclass
class Pharmacy:
    """Pharmacy information"""
    ncpdp_id: str  # National Council for Prescription Drug Programs ID
    npi: Optional[str]
    name: str
    address_line1: str
    city: str
    state: str
    zip_code: str
    phone: str
    fax: Optional[str]


class NCPDPScriptBuilder:
    """
    Builds NCPDP SCRIPT XML messages
    """
    
    NAMESPACE = "http://www.ncpdp.org/schema/SCRIPT"
    VERSION = "2017071"
    
    def __init__(self):
        """Initialize NCPDP SCRIPT builder"""
        self.message_id = None
    
    def build_newrx(
        self,
        prescriber: Prescriber,
        patient: Patient,
        medication: Medication,
        pharmacy: Pharmacy,
        written_date: str,
        effective_date: Optional[str] = None
    ) -> str:
        """
        Build NEWRX (New Prescription) message
        
        Args:
            prescriber: Prescriber information
            patient: Patient information
            medication: Medication information
            pharmacy: Pharmacy information
            written_date: Date prescription written (CCYYMMDD)
            effective_date: Effective date (CCYYMMDD)
        
        Returns:
            NCPDP SCRIPT XML string
        """
        self.message_id = str(uuid.uuid4())
        
        # Create root element
        root = ET.Element("Message", attrib={
            "xmlns": self.NAMESPACE,
            "version": self.VERSION,
            "release": "20170715"
        })
        
        # Header
        header = ET.SubElement(root, "Header")
        ET.SubElement(header, "To").text = pharmacy.ncpdp_id
        ET.SubElement(header, "From").text = prescriber.npi
        ET.SubElement(header, "MessageID").text = self.message_id
        ET.SubElement(header, "SentTime").text = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        
        # Body
        body = ET.SubElement(root, "Body")
        newrx = ET.SubElement(body, "NewRx")
        
        # Prescriber
        prescriber_elem = ET.SubElement(newrx, "Prescriber")
        self._add_prescriber_info(prescriber_elem, prescriber)
        
        # Pharmacy
        pharmacy_elem = ET.SubElement(newrx, "Pharmacy")
        self._add_pharmacy_info(pharmacy_elem, pharmacy)
        
        # Patient
        patient_elem = ET.SubElement(newrx, "Patient")
        self._add_patient_info(patient_elem, patient)
        
        # Medication Prescribed
        med_prescribed = ET.SubElement(newrx, "MedicationPrescribed")
        self._add_medication_info(med_prescribed, medication)
        
        # Prescription details
        ET.SubElement(med_prescribed, "WrittenDate").text = written_date
        if effective_date:
            ET.SubElement(med_prescribed, "EffectiveDate").text = effective_date
        
        # Convert to string
        xml_string = ET.tostring(root, encoding='unicode', method='xml')
        
        logger.info(f"Built NEWRX message {self.message_id}")
        
        return self._format_xml(xml_string)
    
    def build_rxchange(
        self,
        original_message_id: str,
        prescriber: Prescriber,
        patient: Patient,
        medication: Medication,
        pharmacy: Pharmacy,
        change_reason_code: str,
        change_reason_text: str
    ) -> str:
        """
        Build RXCHANGE (Prescription Change) message
        
        Args:
            original_message_id: Original prescription message ID
            prescriber: Prescriber information
            patient: Patient information
            medication: Updated medication information
            pharmacy: Pharmacy information
            change_reason_code: Reason code (e.g., 'DI' for dosage increase)
            change_reason_text: Reason description
        
        Returns:
            NCPDP SCRIPT XML string
        """
        self.message_id = str(uuid.uuid4())
        
        root = ET.Element("Message", attrib={
            "xmlns": self.NAMESPACE,
            "version": self.VERSION,
            "release": "20170715"
        })
        
        # Header
        header = ET.SubElement(root, "Header")
        ET.SubElement(header, "To").text = pharmacy.ncpdp_id
        ET.SubElement(header, "From").text = prescriber.npi
        ET.SubElement(header, "MessageID").text = self.message_id
        ET.SubElement(header, "RelatesToMessageID").text = original_message_id
        ET.SubElement(header, "SentTime").text = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        
        # Body
        body = ET.SubElement(root, "Body")
        rxchange = ET.SubElement(body, "RxChange")
        
        # Change request
        change_request = ET.SubElement(rxchange, "ChangeRequest")
        ET.SubElement(change_request, "ChangeReasonCode").text = change_reason_code
        ET.SubElement(change_request, "ChangeReasonText").text = change_reason_text
        
        # Prescriber
        prescriber_elem = ET.SubElement(rxchange, "Prescriber")
        self._add_prescriber_info(prescriber_elem, prescriber)
        
        # Patient
        patient_elem = ET.SubElement(rxchange, "Patient")
        self._add_patient_info(patient_elem, patient)
        
        # New medication
        med_prescribed = ET.SubElement(rxchange, "MedicationPrescribed")
        self._add_medication_info(med_prescribed, medication)
        
        xml_string = ET.tostring(root, encoding='unicode', method='xml')
        
        logger.info(f"Built RXCHANGE message {self.message_id}")
        
        return self._format_xml(xml_string)
    
    def build_status(
        self,
        reference_message_id: str,
        status_code: str,
        status_text: Optional[str] = None,
        pharmacy: Optional[Pharmacy] = None
    ) -> str:
        """
        Build STATUS message
        
        Args:
            reference_message_id: Message ID being acknowledged
            status_code: Status code (000-050, 900)
            status_text: Optional status description
            pharmacy: Pharmacy sending status
        
        Returns:
            NCPDP SCRIPT XML string
        """
        self.message_id = str(uuid.uuid4())
        
        root = ET.Element("Message", attrib={
            "xmlns": self.NAMESPACE,
            "version": self.VERSION
        })
        
        # Header
        header = ET.SubElement(root, "Header")
        ET.SubElement(header, "MessageID").text = self.message_id
        ET.SubElement(header, "RelatesToMessageID").text = reference_message_id
        ET.SubElement(header, "SentTime").text = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        
        if pharmacy:
            ET.SubElement(header, "From").text = pharmacy.ncpdp_id
        
        # Body
        body = ET.SubElement(root, "Body")
        status = ET.SubElement(body, "Status")
        
        ET.SubElement(status, "Code").text = status_code
        if status_text:
            ET.SubElement(status, "Description").text = status_text
        
        xml_string = ET.tostring(root, encoding='unicode', method='xml')
        
        logger.info(f"Built STATUS message {self.message_id} for {reference_message_id}")
        
        return self._format_xml(xml_string)
    
    def build_error(
        self,
        reference_message_id: str,
        error_code: str,
        error_description: str,
        severity: str = "E"
    ) -> str:
        """
        Build ERROR message
        
        Args:
            reference_message_id: Message ID that caused error
            error_code: Error code
            error_description: Error description
            severity: E (Error), W (Warning), I (Info)
        
        Returns:
            NCPDP SCRIPT XML string
        """
        self.message_id = str(uuid.uuid4())
        
        root = ET.Element("Message", attrib={
            "xmlns": self.NAMESPACE,
            "version": self.VERSION
        })
        
        # Header
        header = ET.SubElement(root, "Header")
        ET.SubElement(header, "MessageID").text = self.message_id
        ET.SubElement(header, "RelatesToMessageID").text = reference_message_id
        ET.SubElement(header, "SentTime").text = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        
        # Body
        body = ET.SubElement(root, "Body")
        error = ET.SubElement(body, "Error")
        
        ET.SubElement(error, "Code").text = error_code
        ET.SubElement(error, "Description").text = error_description
        ET.SubElement(error, "Severity").text = severity
        
        xml_string = ET.tostring(root, encoding='unicode', method='xml')
        
        logger.info(f"Built ERROR message {self.message_id}")
        
        return self._format_xml(xml_string)
    
    def _add_prescriber_info(self, parent: ET.Element, prescriber: Prescriber):
        """Add prescriber information to XML element"""
        identification = ET.SubElement(parent, "Identification")
        ET.SubElement(identification, "NPI").text = prescriber.npi
        
        if prescriber.dea:
            ET.SubElement(identification, "DEANumber").text = prescriber.dea
        
        if prescriber.state_license:
            license_elem = ET.SubElement(identification, "StateLicenseNumber")
            ET.SubElement(license_elem, "Number").text = prescriber.state_license
        
        name = ET.SubElement(parent, "Name")
        ET.SubElement(name, "LastName").text = prescriber.last_name
        ET.SubElement(name, "FirstName").text = prescriber.first_name
        
        address = ET.SubElement(parent, "Address")
        ET.SubElement(address, "AddressLine1").text = prescriber.address_line1
        ET.SubElement(address, "City").text = prescriber.city
        ET.SubElement(address, "State").text = prescriber.state
        ET.SubElement(address, "ZipCode").text = prescriber.zip_code
        
        communication = ET.SubElement(parent, "CommunicationNumbers")
        phone = ET.SubElement(communication, "Phone")
        ET.SubElement(phone, "Number").text = prescriber.phone
        
        if prescriber.fax:
            fax = ET.SubElement(communication, "Fax")
            ET.SubElement(fax, "Number").text = prescriber.fax
    
    def _add_pharmacy_info(self, parent: ET.Element, pharmacy: Pharmacy):
        """Add pharmacy information to XML element"""
        identification = ET.SubElement(parent, "Identification")
        ET.SubElement(identification, "NCPDPID").text = pharmacy.ncpdp_id
        
        if pharmacy.npi:
            ET.SubElement(identification, "NPI").text = pharmacy.npi
        
        ET.SubElement(parent, "BusinessName").text = pharmacy.name
        
        address = ET.SubElement(parent, "Address")
        ET.SubElement(address, "AddressLine1").text = pharmacy.address_line1
        ET.SubElement(address, "City").text = pharmacy.city
        ET.SubElement(address, "State").text = pharmacy.state
        ET.SubElement(address, "ZipCode").text = pharmacy.zip_code
        
        communication = ET.SubElement(parent, "CommunicationNumbers")
        phone = ET.SubElement(communication, "Phone")
        ET.SubElement(phone, "Number").text = pharmacy.phone
    
    def _add_patient_info(self, parent: ET.Element, patient: Patient):
        """Add patient information to XML element"""
        name = ET.SubElement(parent, "Name")
        ET.SubElement(name, "LastName").text = patient.last_name
        ET.SubElement(name, "FirstName").text = patient.first_name
        
        ET.SubElement(parent, "DateOfBirth").text = patient.dob
        ET.SubElement(parent, "Gender").text = patient.gender
        
        address = ET.SubElement(parent, "Address")
        ET.SubElement(address, "AddressLine1").text = patient.address_line1
        ET.SubElement(address, "City").text = patient.city
        ET.SubElement(address, "State").text = patient.state
        ET.SubElement(address, "ZipCode").text = patient.zip_code
        
        communication = ET.SubElement(parent, "CommunicationNumbers")
        phone = ET.SubElement(communication, "Phone")
        ET.SubElement(phone, "Number").text = patient.phone
    
    def _add_medication_info(self, parent: ET.Element, medication: Medication):
        """Add medication information to XML element"""
        drug_desc = ET.SubElement(parent, "DrugDescription")
        ET.SubElement(drug_desc, "Text").text = medication.drug_description
        
        drug_coded = ET.SubElement(parent, "DrugCoded")
        ET.SubElement(drug_coded, "ProductCode").text = medication.drug_coded
        ET.SubElement(drug_coded, "ProductCodeQualifier").text = "ND"  # NDC
        
        quantity = ET.SubElement(parent, "Quantity")
        ET.SubElement(quantity, "Value").text = str(medication.quantity)
        ET.SubElement(quantity, "CodeListQualifier").text = "38"
        ET.SubElement(quantity, "UnitSourceCode").text = medication.quantity_qualifier
        
        ET.SubElement(parent, "DaysSupply").text = str(medication.days_supply)
        ET.SubElement(parent, "Refills").text = str(medication.refills)
        ET.SubElement(parent, "Substitutions").text = medication.substitutions
        
        sig = ET.SubElement(parent, "Sig")
        ET.SubElement(sig, "SigText").text = medication.sig
        
        if medication.note:
            ET.SubElement(parent, "Note").text = medication.note
        
        if medication.diagnosis:
            diagnosis = ET.SubElement(parent, "Diagnosis")
            ET.SubElement(diagnosis, "ClinicalInformationQualifier").text = "DX"
            primary = ET.SubElement(diagnosis, "Primary")
            ET.SubElement(primary, "Value").text = medication.diagnosis
            ET.SubElement(primary, "Qualifier").text = "ABF"  # ICD-10
    
    @staticmethod
    def _format_xml(xml_string: str) -> str:
        """Format XML string with proper indentation"""
        import xml.dom.minidom
        dom = xml.dom.minidom.parseString(xml_string)
        return dom.toprettyxml(indent="  ")


class NCPDPScriptParser:
    """
    Parses NCPDP SCRIPT XML messages
    """
    
    def parse_message(self, xml_string: str) -> Dict:
        """
        Parse NCPDP SCRIPT XML message
        
        Args:
            xml_string: NCPDP SCRIPT XML string
        
        Returns:
            Parsed message dictionary
        """
        try:
            root = ET.fromstring(xml_string)
            
            # Get namespace
            namespace = {"ns": root.tag.split('}')[0].strip('{')}
            
            # Parse header
            header = self._parse_header(root, namespace)
            
            # Parse body
            body_elem = root.find("ns:Body", namespace)
            body = self._parse_body(body_elem, namespace)
            
            message = {
                "header": header,
                "body": body,
                "message_type": body.get("type"),
                "parsed_at": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Parsed {message['message_type']} message {header['message_id']}")
            
            return message
        
        except Exception as e:
            logger.error(f"Failed to parse NCPDP SCRIPT message: {e}")
            raise
    
    def _parse_header(self, root: ET.Element, namespace: Dict) -> Dict:
        """Parse message header"""
        header_elem = root.find("ns:Header", namespace)
        
        return {
            "message_id": self._get_text(header_elem, "ns:MessageID", namespace),
            "to": self._get_text(header_elem, "ns:To", namespace),
            "from": self._get_text(header_elem, "ns:From", namespace),
            "sent_time": self._get_text(header_elem, "ns:SentTime", namespace),
            "relates_to": self._get_text(header_elem, "ns:RelatesToMessageID", namespace)
        }
    
    def _parse_body(self, body_elem: ET.Element, namespace: Dict) -> Dict:
        """Parse message body"""
        # Determine message type
        for child in body_elem:
            tag_name = child.tag.split('}')[-1]
            
            if tag_name == "NewRx":
                return {
                    "type": "NEWRX",
                    "data": self._parse_newrx(child, namespace)
                }
            elif tag_name == "RxChange":
                return {
                    "type": "RXCHANGE",
                    "data": self._parse_rxchange(child, namespace)
                }
            elif tag_name == "Status":
                return {
                    "type": "STATUS",
                    "data": self._parse_status(child, namespace)
                }
            elif tag_name == "Error":
                return {
                    "type": "ERROR",
                    "data": self._parse_error(child, namespace)
                }
        
        return {"type": "UNKNOWN"}
    
    def _parse_newrx(self, newrx_elem: ET.Element, namespace: Dict) -> Dict:
        """Parse NEWRX message"""
        return {
            "prescriber": self._parse_prescriber(
                newrx_elem.find("ns:Prescriber", namespace), namespace
            ),
            "patient": self._parse_patient(
                newrx_elem.find("ns:Patient", namespace), namespace
            ),
            "medication": self._parse_medication(
                newrx_elem.find("ns:MedicationPrescribed", namespace), namespace
            ),
            "pharmacy": self._parse_pharmacy(
                newrx_elem.find("ns:Pharmacy", namespace), namespace
            )
        }
    
    def _parse_rxchange(self, rxchange_elem: ET.Element, namespace: Dict) -> Dict:
        """Parse RXCHANGE message"""
        change_request = rxchange_elem.find("ns:ChangeRequest", namespace)
        
        return {
            "change_reason_code": self._get_text(change_request, "ns:ChangeReasonCode", namespace),
            "change_reason_text": self._get_text(change_request, "ns:ChangeReasonText", namespace),
            "prescriber": self._parse_prescriber(
                rxchange_elem.find("ns:Prescriber", namespace), namespace
            ),
            "patient": self._parse_patient(
                rxchange_elem.find("ns:Patient", namespace), namespace
            ),
            "medication": self._parse_medication(
                rxchange_elem.find("ns:MedicationPrescribed", namespace), namespace
            )
        }
    
    def _parse_status(self, status_elem: ET.Element, namespace: Dict) -> Dict:
        """Parse STATUS message"""
        return {
            "code": self._get_text(status_elem, "ns:Code", namespace),
            "description": self._get_text(status_elem, "ns:Description", namespace)
        }
    
    def _parse_error(self, error_elem: ET.Element, namespace: Dict) -> Dict:
        """Parse ERROR message"""
        return {
            "code": self._get_text(error_elem, "ns:Code", namespace),
            "description": self._get_text(error_elem, "ns:Description", namespace),
            "severity": self._get_text(error_elem, "ns:Severity", namespace)
        }
    
    def _parse_prescriber(self, prescriber_elem: ET.Element, namespace: Dict) -> Dict:
        """Parse prescriber information"""
        if prescriber_elem is None:
            return {}
        
        identification = prescriber_elem.find("ns:Identification", namespace)
        name = prescriber_elem.find("ns:Name", namespace)
        
        return {
            "npi": self._get_text(identification, "ns:NPI", namespace),
            "first_name": self._get_text(name, "ns:FirstName", namespace),
            "last_name": self._get_text(name, "ns:LastName", namespace)
        }
    
    def _parse_patient(self, patient_elem: ET.Element, namespace: Dict) -> Dict:
        """Parse patient information"""
        if patient_elem is None:
            return {}
        
        name = patient_elem.find("ns:Name", namespace)
        
        return {
            "first_name": self._get_text(name, "ns:FirstName", namespace),
            "last_name": self._get_text(name, "ns:LastName", namespace),
            "dob": self._get_text(patient_elem, "ns:DateOfBirth", namespace),
            "gender": self._get_text(patient_elem, "ns:Gender", namespace)
        }
    
    def _parse_medication(self, med_elem: ET.Element, namespace: Dict) -> Dict:
        """Parse medication information"""
        if med_elem is None:
            return {}
        
        drug_desc = med_elem.find("ns:DrugDescription", namespace)
        drug_coded = med_elem.find("ns:DrugCoded", namespace)
        quantity_elem = med_elem.find("ns:Quantity", namespace)
        
        return {
            "description": self._get_text(drug_desc, "ns:Text", namespace),
            "product_code": self._get_text(drug_coded, "ns:ProductCode", namespace),
            "quantity": self._get_text(quantity_elem, "ns:Value", namespace),
            "days_supply": self._get_text(med_elem, "ns:DaysSupply", namespace),
            "refills": self._get_text(med_elem, "ns:Refills", namespace)
        }
    
    def _parse_pharmacy(self, pharmacy_elem: ET.Element, namespace: Dict) -> Dict:
        """Parse pharmacy information"""
        if pharmacy_elem is None:
            return {}
        
        identification = pharmacy_elem.find("ns:Identification", namespace)
        
        return {
            "ncpdp_id": self._get_text(identification, "ns:NCPDPID", namespace),
            "name": self._get_text(pharmacy_elem, "ns:BusinessName", namespace)
        }
    
    @staticmethod
    def _get_text(parent: ET.Element, path: str, namespace: Dict) -> Optional[str]:
        """Safely get text from XML element"""
        if parent is None:
            return None
        
        elem = parent.find(path, namespace)
        return elem.text if elem is not None else None


# Example usage
if __name__ == "__main__":
    # Create sample data
    prescriber = Prescriber(
        npi="1234567890",
        dea="AB1234563",
        state_license="MD12345",
        first_name="Jane",
        last_name="Smith",
        phone="5551234567",
        fax="5557654321",
        address_line1="123 Medical Center Dr",
        city="Boston",
        state="MA",
        zip_code="02101",
        email="jane.smith@hospital.com"
    )
    
    patient = Patient(
        first_name="John",
        last_name="Doe",
        dob="19800115",
        gender="M",
        address_line1="456 Main St",
        city="Boston",
        state="MA",
        zip_code="02102",
        phone="5559876543",
        email="john.doe@email.com"
    )
    
    medication = Medication(
        drug_description="Lisinopril 10mg Tablet",
        drug_coded="00093314601",  # NDC code
        quantity=30.0,
        quantity_qualifier="C48542",  # Each
        days_supply=30,
        refills=3,
        substitutions="1",
        sig="Take 1 tablet by mouth daily",
        note="For hypertension management",
        diagnosis="I10"  # Essential hypertension
    )
    
    pharmacy = Pharmacy(
        ncpdp_id="1234567",
        npi="9876543210",
        name="Main Street Pharmacy",
        address_line1="789 Main St",
        city="Boston",
        state="MA",
        zip_code="02103",
        phone="5551112222",
        fax="5553334444"
    )
    
    # Build NEWRX message
    builder = NCPDPScriptBuilder()
    newrx_xml = builder.build_newrx(
        prescriber=prescriber,
        patient=patient,
        medication=medication,
        pharmacy=pharmacy,
        written_date="20251011"
    )
    
    print("NEWRX Message:")
    print(newrx_xml[:1000] + "...")
    print("\n" + "="*50 + "\n")
    
    # Parse message
    parser = NCPDPScriptParser()
    parsed = parser.parse_message(newrx_xml)
    
    print(f"Parsed Message Type: {parsed['message_type']}")
    print(f"Message ID: {parsed['header']['message_id']}")
    print(f"Patient: {parsed['body']['data']['patient']['first_name']} {parsed['body']['data']['patient']['last_name']}")
    print(f"Medication: {parsed['body']['data']['medication']['description']}")