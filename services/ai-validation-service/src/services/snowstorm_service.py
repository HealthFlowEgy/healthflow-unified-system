import json
import logging
import requests
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
import re

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class SnowstormDrugInteraction:
    """Data class for Snowstorm-based drug interaction information"""
    drug1_concept_id: str
    drug2_concept_id: str
    drug1_name: str
    drug2_name: str
    interaction_type: str
    severity: str  # mild, moderate, severe, contraindicated
    description: str
    clinical_recommendation: str
    mechanism: Optional[str] = None
    management: Optional[str] = None
    snomed_relationship_id: Optional[str] = None

class SnowstormService:
    """Service for interacting with Snowstorm SNOMED CT server"""
    
    def __init__(self, base_url: str = "https://snowstorm.app.evidium.com"):
        self.base_url = base_url.rstrip('/')
        self.branch = "MAIN"  # Default branch
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        })
        
        # Drug interaction relationship types in SNOMED CT
        self.interaction_relationship_types = {
            "363701004": "Direct substance",  # Has active ingredient
            "127489000": "Has active ingredient",
            "738774007": "Is contraindicated with",
            "410942007": "Drug interaction with",
            "363703001": "Has dose form"
        }
        
        # Severity mapping based on SNOMED CT concepts
        self.severity_mapping = {
            "24484000": "severe",      # Severe
            "6736007": "moderate",     # Moderate  
            "255604002": "mild",       # Mild
            "410546004": "contraindicated"  # Contraindicated
        }
    
    def search_drug_concept(self, drug_name: str) -> Optional[Dict]:
        """Search for a drug concept in SNOMED CT"""
        try:
            # Clean and normalize drug name
            normalized_name = self._normalize_drug_name(drug_name)
            
            # Search for pharmaceutical/medicinal product concepts
            url = f"{self.base_url}/{self.branch}/concepts"
            params = {
                'term': normalized_name,
                'activeFilter': True,
                'limit': 10,
                'ecl': '< 373873005'  # Pharmaceutical / biologic product
            }
            
            response = self.session.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            concepts = data.get('items', [])
            
            if concepts:
                # Return the best match (first result is usually most relevant)
                best_match = concepts[0]
                logger.info(f"Found SNOMED concept for '{drug_name}': {best_match['conceptId']} - {best_match['fsn']['term']}")
                return best_match
            else:
                logger.warning(f"No SNOMED concept found for drug: {drug_name}")
                return None
                
        except Exception as e:
            logger.error(f"Error searching for drug concept '{drug_name}': {str(e)}")
            return None
    
    def get_drug_interactions(self, drug_concept_id: str) -> List[Dict]:
        """Get drug interactions for a specific drug concept"""
        try:
            # Get inbound relationships that might indicate interactions
            url = f"{self.base_url}/{self.branch}/concepts/{drug_concept_id}/inbound-relationships"
            params = {
                'activeFilter': True,
                'limit': 100
            }
            
            response = self.session.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            relationships = data.get('items', [])
            
            interactions = []
            for rel in relationships:
                # Check if this is an interaction-related relationship
                type_id = rel.get('type', {}).get('conceptId', '')
                if type_id in self.interaction_relationship_types:
                    interactions.append(rel)
            
            return interactions
            
        except Exception as e:
            logger.error(f"Error getting drug interactions for concept {drug_concept_id}: {str(e)}")
            return []
    
    def check_drug_drug_interactions(self, drug_names: List[str]) -> List[SnowstormDrugInteraction]:
        """Check for drug-drug interactions using Snowstorm"""
        interactions = []
        
        if len(drug_names) < 2:
            return interactions
        
        # Get SNOMED concepts for all drugs
        drug_concepts = {}
        for drug_name in drug_names:
            concept = self.search_drug_concept(drug_name)
            if concept:
                drug_concepts[drug_name] = concept
        
        # Check interactions between each pair of drugs
        drug_list = list(drug_concepts.keys())
        for i, drug1_name in enumerate(drug_list):
            for drug2_name in drug_list[i+1:]:
                drug1_concept = drug_concepts[drug1_name]
                drug2_concept = drug_concepts[drug2_name]
                
                # Check for interactions in both directions
                interaction = self._check_pair_interaction(
                    drug1_name, drug1_concept,
                    drug2_name, drug2_concept
                )
                
                if interaction:
                    interactions.append(interaction)
        
        return interactions
    
    def _check_pair_interaction(self, drug1_name: str, drug1_concept: Dict, 
                               drug2_name: str, drug2_concept: Dict) -> Optional[SnowstormDrugInteraction]:
        """Check for interaction between a specific pair of drugs"""
        try:
            drug1_id = drug1_concept['conceptId']
            drug2_id = drug2_concept['conceptId']
            
            # Get relationships for both drugs
            drug1_relationships = self.get_drug_interactions(drug1_id)
            drug2_relationships = self.get_drug_interactions(drug2_id)
            
            # Look for cross-references or known interaction patterns
            # This is a simplified approach - in practice, you'd need more sophisticated
            # SNOMED CT relationship analysis
            
            # Check if drugs share contraindication patterns or interaction warnings
            interaction = self._analyze_relationships_for_interactions(
                drug1_name, drug1_concept, drug1_relationships,
                drug2_name, drug2_concept, drug2_relationships
            )
            
            return interaction
            
        except Exception as e:
            logger.error(f"Error checking pair interaction between {drug1_name} and {drug2_name}: {str(e)}")
            return None
    
    def _analyze_relationships_for_interactions(self, drug1_name: str, drug1_concept: Dict, drug1_rels: List[Dict],
                                              drug2_name: str, drug2_concept: Dict, drug2_rels: List[Dict]) -> Optional[SnowstormDrugInteraction]:
        """Analyze SNOMED relationships to identify potential interactions"""
        
        # This is a simplified implementation
        # In a real-world scenario, you would need:
        # 1. Access to a comprehensive drug interaction knowledge base
        # 2. More sophisticated SNOMED CT relationship analysis
        # 3. Integration with clinical decision support systems
        
        # For demonstration, we'll use some basic heuristics
        drug1_active_ingredients = self._extract_active_ingredients(drug1_rels)
        drug2_active_ingredients = self._extract_active_ingredients(drug2_rels)
        
        # Check for known problematic combinations
        known_interactions = self._check_known_interactions(
            drug1_name, drug1_active_ingredients,
            drug2_name, drug2_active_ingredients
        )
        
        if known_interactions:
            return SnowstormDrugInteraction(
                drug1_concept_id=drug1_concept['conceptId'],
                drug2_concept_id=drug2_concept['conceptId'],
                drug1_name=drug1_name,
                drug2_name=drug2_name,
                interaction_type="drug_drug_interaction",
                severity=known_interactions['severity'],
                description=known_interactions['description'],
                clinical_recommendation=known_interactions['recommendation'],
                mechanism=known_interactions.get('mechanism'),
                management=known_interactions.get('management')
            )
        
        return None
    
    def _extract_active_ingredients(self, relationships: List[Dict]) -> List[str]:
        """Extract active ingredients from SNOMED relationships"""
        ingredients = []
        for rel in relationships:
            type_id = rel.get('type', {}).get('conceptId', '')
            if type_id in ['363701004', '127489000']:  # Has active ingredient
                target = rel.get('target', {})
                if target:
                    ingredients.append(target.get('conceptId', ''))
        return ingredients
    
    def _check_known_interactions(self, drug1_name: str, drug1_ingredients: List[str],
                                 drug2_name: str, drug2_ingredients: List[str]) -> Optional[Dict]:
        """Check against known drug interaction patterns"""
        
        # Normalize drug names for comparison
        drug1_norm = self._normalize_drug_name(drug1_name)
        drug2_norm = self._normalize_drug_name(drug2_name)
        
        # Known interaction patterns (this would be much more comprehensive in practice)
        known_patterns = {
            ('warfarin', 'aspirin'): {
                'severity': 'severe',
                'description': 'Increased risk of bleeding due to additive anticoagulant effects',
                'recommendation': 'Avoid concurrent use or monitor closely with frequent INR checks',
                'mechanism': 'Both drugs affect blood clotting mechanisms',
                'management': 'Consider alternative antiplatelet therapy or adjust warfarin dosing'
            },
            ('lisinopril', 'ibuprofen'): {
                'severity': 'moderate',
                'description': 'Reduced antihypertensive effect and potential kidney function impairment',
                'recommendation': 'Monitor blood pressure and kidney function',
                'mechanism': 'NSAIDs reduce prostaglandin-mediated vasodilation',
                'management': 'Use lowest effective NSAID dose for shortest duration'
            },
            ('simvastatin', 'clarithromycin'): {
                'severity': 'severe',
                'description': 'Increased risk of myopathy and rhabdomyolysis',
                'recommendation': 'Avoid concurrent use',
                'mechanism': 'CYP3A4 inhibition increases statin levels',
                'management': 'Use alternative antibiotic or temporarily discontinue statin'
            },
            ('metformin', 'contrast'): {
                'severity': 'moderate',
                'description': 'Risk of lactic acidosis in patients with kidney impairment',
                'recommendation': 'Hold metformin before contrast procedures',
                'mechanism': 'Contrast agents can affect kidney function',
                'management': 'Discontinue 48 hours before contrast, resume after kidney function confirmed normal'
            }
        }
        
        # Check both directions
        key1 = (drug1_norm, drug2_norm)
        key2 = (drug2_norm, drug1_norm)
        
        if key1 in known_patterns:
            return known_patterns[key1]
        elif key2 in known_patterns:
            return known_patterns[key2]
        
        return None
    
    def _normalize_drug_name(self, drug_name: str) -> str:
        """Normalize drug name for comparison"""
        return drug_name.lower().strip().replace(' ', '').replace('-', '')
    
    def get_concept_details(self, concept_id: str) -> Optional[Dict]:
        """Get detailed information about a SNOMED concept"""
        try:
            url = f"{self.base_url}/{self.branch}/concepts/{concept_id}"
            response = self.session.get(url)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error getting concept details for {concept_id}: {str(e)}")
            return None
    
    def search_concepts_by_ecl(self, ecl_expression: str, limit: int = 50) -> List[Dict]:
        """Search concepts using Expression Constraint Language (ECL)"""
        try:
            url = f"{self.base_url}/{self.branch}/concepts"
            params = {
                'ecl': ecl_expression,
                'activeFilter': True,
                'limit': limit
            }
            
            response = self.session.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            return data.get('items', [])
            
        except Exception as e:
            logger.error(f"Error searching concepts with ECL '{ecl_expression}': {str(e)}")
            return []

