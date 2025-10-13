"""
Medical Prescription OCR Service
Integrates the Medical-Prescription-OCR module (Donut transformer)
Repository: https://github.com/HealthFlowEgy/Medical-Prescription-OCR
"""

import os
import sys
import torch
import logging
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
from PIL import Image

# Add medical_ocr module to path
MEDICAL_OCR_PATH = Path(__file__).parent.parent / 'ml_models' / 'medical_ocr'
if str(MEDICAL_OCR_PATH) not in sys.path:
    sys.path.insert(0, str(MEDICAL_OCR_PATH))

from transformers import VisionEncoderDecoderModel, DonutProcessor, pipeline

logger = logging.getLogger(__name__)


class MedicalOCRService:
    """
    Medical Prescription OCR Service using Donut Transformer
    
    Features:
    - 84% word-level accuracy on handwritten prescriptions
    - Zero-shot classification for prescription verification
    - Structured text extraction
    - Medical keyword detection
    
    Based on: chinmays18/medical-prescription-ocr
    """
    
    # Medical keywords for heuristic validation
    MEDICAL_KEYWORDS = [
        "prescribed", "take", "mg", "ml", "capsules", "dosage",
        "dr.", "doctor", "patient", "medications", "apply", "signature",
        "clinic", "pharmacy", "rx", "dose", "medicine", "drug",
        "tablet", "syrup", "injection", "ointment", "drops"
    ]
    
    # Zero-shot classification labels
    CLASSIFICATION_LABELS = ["medical prescription", "not medical prescription"]
    
    def __init__(self, model_dir: Optional[str] = None):
        """
        Initialize Medical OCR Service
        
        Args:
            model_dir: Path to model directory (default: src/ml_models/medical_ocr/model)
        """
        # Determine model path
        if model_dir is None:
            self.model_dir = MEDICAL_OCR_PATH / 'model'
        else:
            self.model_dir = Path(model_dir)
        
        # Device configuration
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        logger.info(f"Initializing Medical OCR Service on {self.device}")
        logger.info(f"Model directory: {self.model_dir}")
        
        # Lazy loading - models loaded on first use
        self._processor = None
        self._donut_model = None
        self._classifier = None
        self._loaded = False
    
    def _load_models(self):
        """Load Donut OCR and classifier models (lazy loading)"""
        if self._loaded:
            return
        
        try:
            logger.info("Loading Donut OCR model...")
            
            # Check if model directory exists
            if not self.model_dir.exists():
                raise FileNotFoundError(
                    f"Model directory not found: {self.model_dir}\n"
                    f"Please run: python src/ml_models/medical_ocr/model_download.py"
                )
            
            # Load processor and Donut model
            self._processor = DonutProcessor.from_pretrained(str(self.model_dir))
            self._donut_model = VisionEncoderDecoderModel.from_pretrained(str(self.model_dir))
            
            # Move to device and set to eval mode
            self._donut_model.to(self.device)
            self._donut_model.eval()
            
            logger.info("✅ Donut OCR model loaded successfully")
            
            # Load zero-shot classifier
            logger.info("Loading zero-shot classifier...")
            device_id = 0 if self.device == "cuda" else -1
            self._classifier = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli",
                device=device_id
            )
            logger.info("✅ Zero-shot classifier loaded successfully")
            
            self._loaded = True
            
        except FileNotFoundError as e:
            logger.error(str(e))
            raise
        except Exception as e:
            logger.error(f"Failed to load models: {e}")
            raise RuntimeError(f"Could not load Medical OCR models: {e}")
    
    def extract_text_from_image(self, image_path: str) -> str:
        """
        Extract text from prescription image using Donut OCR
        
        Args:
            image_path: Path to image file
            
        Returns:
            Extracted text string
        """
        # Ensure models are loaded
        self._load_models()
        
        try:
            # Load and preprocess image
            image = Image.open(image_path).convert("RGB")
            
            # Process image with Donut processor
            encoding = self._processor(images=image, return_tensors="pt").to(self.device)
            
            # Generate text
            with torch.no_grad():
                generated_ids = self._donut_model.generate(
                    encoding.pixel_values,
                    max_length=512,
                    num_beams=1,
                    early_stopping=True,
                    decoder_start_token_id=self._processor.tokenizer.convert_tokens_to_ids("<s_ocr>")
                )
            
            # Decode to text
            generated_text = self._processor.tokenizer.batch_decode(
                generated_ids,
                skip_special_tokens=True
            )[0].strip()
            
            return generated_text
            
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            raise
    
    def classify_prescription_zero_shot(self, text: str) -> Tuple[str, float]:
        """
        Classify extracted text using zero-shot classification + heuristics
        
        Args:
            text: Extracted text from OCR
            
        Returns:
            Tuple of (predicted_label, confidence_score)
        """
        # Ensure models are loaded
        self._load_models()
        
        if not text:
            return "No text found", 0.0
        
        try:
            # Zero-shot classification
            result = self._classifier(text, self.CLASSIFICATION_LABELS)
            predicted_label = result["labels"][0]
            confidence = result["scores"][0]
            
            # Heuristic check for medical keywords
            text_lower = text.lower()
            has_medical_keywords = any(
                keyword in text_lower for keyword in self.MEDICAL_KEYWORDS
            )
            
            # Adjust prediction based on heuristics
            if predicted_label == "not medical prescription" and has_medical_keywords:
                predicted_label = "medical prescription"
                confidence = max(confidence, 0.75)
            elif predicted_label == "medical prescription" and not has_medical_keywords:
                predicted_label = "not medical prescription"
                confidence = max(confidence, 0.75)
            
            return predicted_label, confidence
            
        except Exception as e:
            logger.error(f"Classification failed: {e}")
            return "error", 0.0
    
    def process_prescription(
        self,
        image_path: str,
        validate_type: bool = True
    ) -> Dict[str, Any]:
        """
        Complete prescription processing pipeline
        
        Args:
            image_path: Path to prescription image
            validate_type: Whether to validate it's a prescription first
            
        Returns:
            Complete processing result with extracted text and classification
        """
        result = {
            "success": False,
            "extracted_text": "",
            "is_prescription": None,
            "confidence": 0.0,
            "model": "donut-transformer",
            "device": self.device,
            "error": None
        }
        
        try:
            # Step 1: Extract text with OCR
            logger.info(f"Processing image: {image_path}")
            extracted_text = self.extract_text_from_image(image_path)
            result["extracted_text"] = extracted_text
            
            if not extracted_text:
                result["error"] = "No text extracted from image"
                return result
            
            # Step 2: Classify if requested
            if validate_type:
                predicted_label, confidence = self.classify_prescription_zero_shot(extracted_text)
                result["is_prescription"] = (predicted_label == "medical prescription")
                result["confidence"] = confidence
                
                if not result["is_prescription"]:
                    result["error"] = f"Image classified as: {predicted_label}"
                    return result
            else:
                # Assume it's a prescription
                result["is_prescription"] = True
                result["confidence"] = 0.8
            
            # Success
            result["success"] = True
            logger.info(f"Processing successful. Confidence: {result['confidence']:.2%}")
            
            return result
            
        except Exception as e:
            logger.error(f"Prescription processing failed: {e}")
            result["error"] = str(e)
            return result
    
    def extract_structured_data(self, text: str) -> Dict[str, Any]:
        """
        Parse extracted text into structured format
        
        Args:
            text: Raw extracted text
            
        Returns:
            Structured dictionary with medications, patient info, etc.
        """
        import re
        
        structured = {
            "medications": [],
            "patient_info": {},
            "doctor_info": {},
            "instructions": []
        }
        
        if not text:
            return structured
        
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            line_lower = line.lower()
            
            # Extract patient name
            if 'patient' in line_lower or 'name' in line_lower:
                # Try to extract name after colon or "patient:"
                match = re.search(r'patient[:\s]+([A-Za-z\s]+)', line, re.IGNORECASE)
                if match:
                    structured['patient_info']['name'] = match.group(1).strip()
            
            # Extract doctor name
            elif 'doctor' in line_lower or 'dr.' in line_lower:
                match = re.search(r'(?:doctor|dr\.)[:\s]+([A-Za-z\s]+)', line, re.IGNORECASE)
                if match:
                    structured['doctor_info']['name'] = match.group(1).strip()
            
            # Extract medication (look for dosage patterns)
            elif re.search(r'\d+\s*(?:mg|ml|g|mcg)', line, re.IGNORECASE):
                med = self._parse_medication_line(line)
                if med:
                    structured['medications'].append(med)
            
            # General instruction
            else:
                structured['instructions'].append(line)
        
        return structured
    
    def _parse_medication_line(self, line: str) -> Optional[Dict[str, str]]:
        """Parse a single medication line"""
        import re
        
        med = {
            "drug_name": "",
            "dosage": "",
            "frequency": "",
            "duration": ""
        }
        
        # Extract dosage (e.g., 500mg, 10ml)
        dosage_match = re.search(r'(\d+\s*(?:mg|ml|g|mcg|units?))', line, re.IGNORECASE)
        if dosage_match:
            med['dosage'] = dosage_match.group(1)
        
        # Extract frequency (e.g., TID, BID, once daily)
        freq_patterns = r'(TID|BID|QID|once\s+daily|twice\s+daily|three\s+times|every\s+\d+\s+hours?)'
        freq_match = re.search(freq_patterns, line, re.IGNORECASE)
        if freq_match:
            med['frequency'] = freq_match.group(1)
        
        # Extract duration (e.g., 7 days, 2 weeks)
        duration_match = re.search(r'(\d+\s+(?:days?|weeks?|months?))', line, re.IGNORECASE)
        if duration_match:
            med['duration'] = duration_match.group(1)
        
        # Drug name is typically the first word(s)
        words = line.split()
        if words:
            # Take first 1-2 words as drug name
            med['drug_name'] = ' '.join(words[:2]) if len(words) > 1 else words[0]
        
        # Only return if we extracted something meaningful
        if med['drug_name'] or med['dosage']:
            return med
        
        return None


# Singleton instance
_medical_ocr_service = None

def get_medical_ocr_service() -> MedicalOCRService:
    """Get singleton instance of Medical OCR Service"""
    global _medical_ocr_service
    
    if _medical_ocr_service is None:
        _medical_ocr_service = MedicalOCRService()
    
    return _medical_ocr_service
