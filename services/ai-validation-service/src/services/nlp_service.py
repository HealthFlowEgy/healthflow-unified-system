import re
import json
import logging
from typing import Dict, List, Optional, Tuple, Union
from datetime import datetime, date
from abc import ABC, abstractmethod
import requests
from dataclasses import dataclass

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class ExtractedEntity:
    """Data class for extracted entities"""
    text: str
    entity_type: str
    confidence: float
    start_pos: int
    end_pos: int
    normalized_value: Optional[str] = None

@dataclass
class MedicationInfo:
    """Data class for medication information"""
    drug_name: str
    generic_name: Optional[str] = None
    dosage: Optional[str] = None
    strength: Optional[str] = None
    formulation: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None
    duration: Optional[str] = None
    quantity: Optional[str] = None
    instructions: Optional[str] = None
    confidence: float = 0.0

class MedicalDocParser(ABC):
    """Abstract base class for medical document parsers"""
    
    def __init__(self, text: str):
        self.text = text
    
    @abstractmethod
    def parse(self) -> Dict:
        pass

class PrescriptionParser(MedicalDocParser):
    """Enhanced prescription parser combining regex patterns with NLP"""
    
    def __init__(self, text: str):
        super().__init__(text)
        self.patterns = {
            'patient_name': [
                r'(?:Name|Patient|Pt):\s*([A-Za-z\s,.-]+?)(?:\s+Date|DOB|\n)',
                r'Patient:\s*([A-Za-z\s,.-]+)',
                r'Name:\s*([A-Za-z\s,.-]+)'
            ],
            'patient_dob': [
                r'(?:DOB|Date of Birth|Born):\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'DOB:\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'Date:\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
            ],
            'patient_address': [
                r'(?:Address|Addr):\s*([^\\n]+(?:\\n[^\\n]+)*?)(?=\\n\\n|\\nRx|\\nMedication|$)',
                r'Address:\s*([^\\n]+)',
                r'(?:Address|Addr):\s*(.+?)(?=\\n[A-Z]|$)'
            ],
            'prescriber_name': [
                r'Dr\\.?\\s+([A-Za-z\\s,.-]+?)(?:,\\s*M\\.?D\\.?|\\n)',
                r'(?:Dr|Doctor|Physician):\s*([A-Za-z\\s,.-]+)',
                r'^([A-Za-z\\s,.-]+),\\s*M\\.?D\\.?'
            ],
            'prescriber_license': [
                r'(?:License|Lic|DEA)\\s*#?:?\\s*([A-Z0-9-]+)',
                r'DEA\\s*#?:?\\s*([A-Z0-9-]+)',
                r'License\\s*#?:?\\s*([A-Z0-9-]+)'
            ],
            'prescription_date': [
                r'Date:\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'(?:Prescribed|Rx Date):\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
            ],
            'medications': [
                r'(?:Rx|Medication|Medicine)s?:\s*([^\\n]+(?:\\n[^\\n]+)*?)(?=\\n\\n|\\nDirections|\\nRefill|$)',
                r'(?:Address:[^\\n]*\\n)(.*?)(?=Directions|Refill|$)',
                r'(?:Medications?|Rx):\s*(.+?)(?=\\n[A-Z]|$)'
            ],
            'directions': [
                r'(?:Directions|Instructions|Sig):\s*([^\\n]+(?:\\n[^\\n]+)*?)(?=\\n\\n|\\nRefill|$)',
                r'Directions:\s*(.+?)(?=Refill|$)',
                r'(?:Take|Use|Apply):\s*(.+?)(?=\\n[A-Z]|$)'
            ],
            'refill': [
                r'(?:Refill|Refills?):\s*([0-9]+)\\s*(?:times?|x)',
                r'Refill:\s*_?([0-9]+)_?\\s*times?',
                r'([0-9]+)\\s*refills?'
            ],
            'quantity': [
                r'(?:Quantity|Qty|Disp):\s*([0-9]+)',
                r'#([0-9]+)',
                r'Dispense:\s*([0-9]+)'
            ]
        }
    
    def parse(self) -> Dict:
        """Parse prescription text and extract structured information"""
        try:
            result = {}
            
            for field_name, patterns in self.patterns.items():
                result[field_name] = self.extract_field(field_name, patterns)
            
            # Post-process medications to extract individual drugs
            if result.get('medications'):
                result['parsed_medications'] = self.parse_medications(result['medications'])
            
            # Add metadata
            result['parsing_timestamp'] = datetime.now().isoformat()
            result['confidence_score'] = self.calculate_confidence(result)
            
            return result
            
        except Exception as e:
            logger.error(f"Error parsing prescription: {str(e)}")
            return {'error': str(e)}
    
    def extract_field(self, field_name: str, patterns: List[str]) -> Optional[str]:
        """Extract field using multiple regex patterns"""
        for pattern in patterns:
            try:
                matches = re.findall(pattern, self.text, re.IGNORECASE | re.DOTALL)
                if matches:
                    result = matches[0].strip()
                    if result:
                        return result
            except re.error as e:
                logger.warning(f"Regex error for {field_name}: {str(e)}")
                continue
        return None
    
    def parse_medications(self, medications_text: str) -> List[Dict]:
        """Parse medications text to extract individual medication details"""
        medications = []
        
        # Split by common separators
        med_lines = re.split(r'\\n|;|\\.|(?=\\d+\\.)', medications_text)
        
        for line in med_lines:
            line = line.strip()
            if not line or len(line) < 3:
                continue
            
            med_info = self.parse_single_medication(line)
            if med_info:
                medications.append(med_info)
        
        return medications
    
    def parse_single_medication(self, med_text: str) -> Optional[Dict]:
        """Parse a single medication line"""
        try:
            # Extract drug name (usually at the beginning)
            drug_name_match = re.match(r'^([A-Za-z\\s]+)', med_text)
            drug_name = drug_name_match.group(1).strip() if drug_name_match else None
            
            # Extract dosage/strength
            dosage_patterns = [
                r'(\\d+(?:\\.\\d+)?\\s*(?:mg|mcg|g|mL|units?))',
                r'(\\d+(?:\\.\\d+)?\\s*(?:milligrams?|micrograms?|grams?))',
                r'(\\d+(?:\\.\\d+)?\\s*(?:tablet|cap|capsule)s?)'
            ]
            
            dosage = None
            for pattern in dosage_patterns:
                match = re.search(pattern, med_text, re.IGNORECASE)
                if match:
                    dosage = match.group(1)
                    break
            
            # Extract frequency
            frequency_patterns = [
                r'(?:take|use)\\s*(\\d+)\\s*(?:times?|x)\\s*(?:daily|per day|a day)',
                r'(?:once|twice|three times|four times)\\s*(?:daily|per day|a day)',
                r'every\\s*(\\d+)\\s*hours?',
                r'(daily|twice daily|BID|TID|QID|PRN)'
            ]
            
            frequency = None
            for pattern in frequency_patterns:
                match = re.search(pattern, med_text, re.IGNORECASE)
                if match:
                    frequency = match.group(0)
                    break
            
            if drug_name:
                return {
                    'drug_name': drug_name,
                    'dosage': dosage,
                    'frequency': frequency,
                    'original_text': med_text,
                    'confidence': 0.8 if dosage and frequency else 0.6
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error parsing medication '{med_text}': {str(e)}")
            return None
    
    def calculate_confidence(self, parsed_data: Dict) -> float:
        """Calculate overall confidence score for parsed data"""
        required_fields = ['patient_name', 'medications', 'directions']
        optional_fields = ['patient_address', 'prescriber_name', 'prescription_date']
        
        score = 0.0
        total_weight = 0.0
        
        # Required fields (higher weight)
        for field in required_fields:
            weight = 0.4
            total_weight += weight
            if parsed_data.get(field):
                score += weight
        
        # Optional fields (lower weight)
        for field in optional_fields:
            weight = 0.1
            total_weight += weight
            if parsed_data.get(field):
                score += weight
        
        return round(score / total_weight if total_weight > 0 else 0.0, 2)

class MedicationNER:
    """Enhanced Named Entity Recognition for medications"""
    
    def __init__(self, openfda_api_key: Optional[str] = None):
        self.openfda_api_key = openfda_api_key
        self.medications_cache = set()
        self.last_cache_update = None
        
        # Define comprehensive entity patterns
        self.entity_patterns = {
            'MEDICATION': {
                'patterns': [
                    r'\\b[A-Z][a-z]+(?:in|ol|ex|ide|ine|ate|one)\\b',  # Common drug suffixes
                    r'\\b(?:Aspirin|Ibuprofen|Acetaminophen|Tylenol|Advil|Motrin)\\b'
                ],
                'confidence': 0.7
            },
            'DOSAGE': {
                'patterns': [
                    r'\\d+(?:\\.\\d+)?\\s*(?:mg|mcg|g|mL|units?|tablets?|caps?|capsules?)\\b',
                    r'\\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\\s+(?:tablet|cap|capsule)s?\\b'
                ],
                'confidence': 0.9
            },
            'STRENGTH': {
                'patterns': [
                    r'\\d+(?:\\.\\d+)?\\s*(?:mg|mcg|%|units?/mL)\\b',
                    r'\\d+/\\d+\\s*(?:mg|mcg)\\b'
                ],
                'confidence': 0.9
            },
            'FREQUENCY': {
                'patterns': [
                    r'\\b(?:once|twice|three times|four times)\\s*(?:daily|per day|a day)\\b',
                    r'\\bevery\\s+\\d+\\s+hours?\\b',
                    r'\\b(?:BID|TID|QID|PRN|daily|twice daily)\\b',
                    r'\\b(?:morning|evening|bedtime|before meals|after meals)\\b'
                ],
                'confidence': 0.8
            },
            'ROUTE': {
                'patterns': [
                    r'\\b(?:orally|by mouth|topically|intramuscularly|subcutaneously)\\b',
                    r'\\b(?:inhale|via inhaler|into each eye|under the tongue|sublingual)\\b',
                    r'\\b(?:intravenously|IV|IM|SC|PO|topical)\\b'
                ],
                'confidence': 0.8
            },
            'DURATION': {
                'patterns': [
                    r'\\bfor\\s+\\d+\\s+(?:days?|weeks?|months?)\\b',
                    r'\\b\\d+\\s+(?:days?|weeks?|months?)\\b',
                    r'\\buntil finished\\b',
                    r'\\bcontinue for\\s+\\d+\\s+(?:days?|weeks?)\\b'
                ],
                'confidence': 0.8
            },
            'FORMULATION': {
                'patterns': [
                    r'\\b(?:tablet|capsule|cream|ointment|gel|lotion|solution|syrup)s?\\b',
                    r'\\b(?:suspension|drops|patch|injection|inhaler|suppository)s?\\b'
                ],
                'confidence': 0.7
            }
        }
        
        # Initialize medication cache if API key provided
        if self.openfda_api_key:
            self._update_medications_cache()
    
    def _update_medications_cache(self):
        """Update medications cache from OpenFDA API"""
        try:
            if (not self.last_cache_update or 
                (datetime.now() - self.last_cache_update).days >= 1):
                
                medications = self._fetch_medications_from_openfda()
                if medications:
                    self.medications_cache = set(medications)
                    self.last_cache_update = datetime.now()
                    logger.info(f"Updated medications cache with {len(medications)} entries")
                
        except Exception as e:
            logger.error(f"Error updating medications cache: {str(e)}")
    
    def _fetch_medications_from_openfda(self) -> List[str]:
        """Fetch medication names from OpenFDA API"""
        try:
            medications = set()
            base_url = "https://api.fda.gov/drug/ndc.json"
            
            params = {
                'search': 'product_type:"HUMAN PRESCRIPTION DRUG"',
                'limit': 1000,
                'api_key': self.openfda_api_key
            }
            
            response = requests.get(base_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if 'results' in data:
                for result in data['results']:
                    # Add generic names
                    if 'generic_name' in result:
                        medications.add(result['generic_name'].title())
                    
                    # Add brand names
                    if 'brand_name' in result:
                        medications.add(result['brand_name'].title())
                    
                    # Add active ingredients
                    if 'active_ingredients' in result:
                        for ingredient in result['active_ingredients']:
                            if 'name' in ingredient:
                                medications.add(ingredient['name'].title())
            
            return list(medications)
            
        except Exception as e:
            logger.error(f"Error fetching medications from OpenFDA: {str(e)}")
            return []
    
    def extract_entities(self, text: str) -> Dict[str, List[ExtractedEntity]]:
        """Extract entities from text using pattern matching and NLP"""
        entities = {entity_type: [] for entity_type in self.entity_patterns.keys()}
        
        # Pattern-based extraction
        for entity_type, config in self.entity_patterns.items():
            for pattern in config['patterns']:
                for match in re.finditer(pattern, text, re.IGNORECASE):
                    entity = ExtractedEntity(
                        text=match.group().strip(),
                        entity_type=entity_type,
                        confidence=config['confidence'],
                        start_pos=match.start(),
                        end_pos=match.end()
                    )
                    entities[entity_type].append(entity)
        
        # Medication name extraction from cache
        if self.medications_cache:
            words = text.split()
            for i in range(len(words)):
                for j in range(i + 1, min(i + 4, len(words) + 1)):  # Check up to 3-word phrases
                    phrase = ' '.join(words[i:j]).strip().title()
                    if phrase in self.medications_cache:
                        start_pos = text.lower().find(phrase.lower())
                        if start_pos != -1:
                            entity = ExtractedEntity(
                                text=phrase,
                                entity_type='MEDICATION',
                                confidence=0.9,
                                start_pos=start_pos,
                                end_pos=start_pos + len(phrase)
                            )
                            entities['MEDICATION'].append(entity)
        
        # Remove duplicates and sort by position
        for entity_type in entities:
            seen = set()
            unique_entities = []
            for entity in sorted(entities[entity_type], key=lambda x: x.start_pos):
                if entity.text.lower() not in seen:
                    seen.add(entity.text.lower())
                    unique_entities.append(entity)
            entities[entity_type] = unique_entities
        
        return entities

class NLPService:
    """Comprehensive NLP service for prescription processing"""
    
    def __init__(self, openfda_api_key: Optional[str] = None):
        self.prescription_parser = PrescriptionParser("")
        self.medication_ner = MedicationNER(openfda_api_key)
        logger.info("NLP Service initialized")
    
    def process_prescription_text(self, text: str) -> Dict:
        """Process prescription text with both parsing and NER"""
        try:
            start_time = datetime.now()
            
            # Update parser text
            self.prescription_parser.text = text
            
            # Parse structured information
            parsed_data = self.prescription_parser.parse()
            
            # Extract entities
            entities = self.medication_ner.extract_entities(text)
            
            # Convert entities to serializable format
            serializable_entities = {}
            for entity_type, entity_list in entities.items():
                serializable_entities[entity_type] = [
                    {
                        'text': entity.text,
                        'confidence': entity.confidence,
                        'start_pos': entity.start_pos,
                        'end_pos': entity.end_pos
                    }
                    for entity in entity_list
                ]
            
            # Combine results
            result = {
                'parsed_data': parsed_data,
                'extracted_entities': serializable_entities,
                'processing_metadata': {
                    'processing_time': (datetime.now() - start_time).total_seconds(),
                    'timestamp': datetime.now().isoformat(),
                    'text_length': len(text),
                    'entity_count': sum(len(entities) for entities in serializable_entities.values())
                }
            }
            
            logger.info(f"NLP processing completed in {result['processing_metadata']['processing_time']:.3f}s")
            return result
            
        except Exception as e:
            logger.error(f"Error in NLP processing: {str(e)}")
            return {
                'error': str(e),
                'parsed_data': {},
                'extracted_entities': {},
                'processing_metadata': {
                    'processing_time': 0,
                    'timestamp': datetime.now().isoformat(),
                    'text_length': len(text) if text else 0,
                    'entity_count': 0
                }
            }
    
    def extract_medications_info(self, text: str) -> List[MedicationInfo]:
        """Extract detailed medication information"""
        try:
            entities = self.medication_ner.extract_entities(text)
            medications = []
            
            # Group entities by medication
            medication_entities = entities.get('MEDICATION', [])
            
            for med_entity in medication_entities:
                med_info = MedicationInfo(
                    drug_name=med_entity.text,
                    confidence=med_entity.confidence
                )
                
                # Find related entities near this medication
                med_start = med_entity.start_pos
                med_end = med_entity.end_pos
                
                # Look for dosage, frequency, etc. within reasonable distance
                search_window = 100  # characters
                
                for entity_type in ['DOSAGE', 'STRENGTH', 'FREQUENCY', 'ROUTE', 'DURATION', 'FORMULATION']:
                    for entity in entities.get(entity_type, []):
                        if (abs(entity.start_pos - med_end) <= search_window or 
                            abs(med_start - entity.end_pos) <= search_window):
                            
                            if entity_type == 'DOSAGE':
                                med_info.dosage = entity.text
                            elif entity_type == 'STRENGTH':
                                med_info.strength = entity.text
                            elif entity_type == 'FREQUENCY':
                                med_info.frequency = entity.text
                            elif entity_type == 'ROUTE':
                                med_info.route = entity.text
                            elif entity_type == 'DURATION':
                                med_info.duration = entity.text
                            elif entity_type == 'FORMULATION':
                                med_info.formulation = entity.text
                
                medications.append(med_info)
            
            return medications
            
        except Exception as e:
            logger.error(f"Error extracting medication info: {str(e)}")
            return []

# Convenience functions
def process_prescription(text: str, openfda_api_key: Optional[str] = None) -> Dict:
    """Process prescription text using NLP service"""
    nlp_service = NLPService(openfda_api_key)
    return nlp_service.process_prescription_text(text)

def extract_medications(text: str, openfda_api_key: Optional[str] = None) -> List[Dict]:
    """Extract medication information from text"""
    nlp_service = NLPService(openfda_api_key)
    medications = nlp_service.extract_medications_info(text)
    return [
        {
            'drug_name': med.drug_name,
            'generic_name': med.generic_name,
            'dosage': med.dosage,
            'strength': med.strength,
            'formulation': med.formulation,
            'frequency': med.frequency,
            'route': med.route,
            'duration': med.duration,
            'quantity': med.quantity,
            'instructions': med.instructions,
            'confidence': med.confidence
        }
        for med in medications
    ]

