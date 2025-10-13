"""
Hybrid OCR Service - Combines Donut Transformer and Tesseract OCR
Provides best-in-class OCR for medical prescriptions
"""

import os
import logging
from typing import Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


class HybridOCRService:
    """
    Hybrid OCR Service combining:
    - Donut Transformer (primary): For handwritten prescriptions
    - Tesseract OCR (fallback): For printed text and backup
    
    Automatically selects the best engine based on image characteristics
    """
    
    def __init__(self, default_engine: str = None):
        """
        Initialize Hybrid OCR Service
        
        Args:
            default_engine: 'donut', 'tesseract', or 'auto' (default)
        """
        self.default_engine = default_engine or os.getenv('OCR_ENGINE', 'auto')
        
        # Lazy loading of engines
        self._medical_ocr = None
        self._tesseract_ocr = None
        
        logger.info(f"Hybrid OCR Service initialized (default engine: {self.default_engine})")
    
    def _get_medical_ocr(self):
        """Lazy load Medical OCR (Donut) service"""
        if self._medical_ocr is None:
            try:
                from src.services.medical_ocr_service import get_medical_ocr_service
                self._medical_ocr = get_medical_ocr_service()
                logger.info("✅ Medical OCR (Donut) loaded")
            except Exception as e:
                logger.warning(f"Could not load Medical OCR: {e}")
                self._medical_ocr = False  # Mark as unavailable
        return self._medical_ocr if self._medical_ocr is not False else None
    
    def _get_tesseract_ocr(self):
        """Lazy load Tesseract OCR service"""
        if self._tesseract_ocr is None:
            try:
                # Import the existing OCR service (Tesseract-based)
                import sys
                from pathlib import Path
                sys.path.insert(0, str(Path(__file__).parent))
                
                # Import the original OCRService class
                import importlib.util
                spec = importlib.util.spec_from_file_location(
                    "ocr_service_original",
                    Path(__file__).parent / "ocr_service.py"
                )
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                self._tesseract_ocr = module.OCRService()
                logger.info("✅ Tesseract OCR loaded")
            except Exception as e:
                logger.warning(f"Could not load Tesseract OCR: {e}")
                self._tesseract_ocr = False
        return self._tesseract_ocr if self._tesseract_ocr is not False else None
    
    def extract_text(
        self,
        image_path: str,
        engine: Optional[str] = None,
        fallback: bool = True
    ) -> Dict[str, Any]:
        """
        Extract text from prescription image
        
        Args:
            image_path: Path to image file
            engine: Force specific engine ('donut' or 'tesseract'), or None for auto
            fallback: If True, try fallback engine on failure
            
        Returns:
            Dictionary with extracted text and metadata
        """
        logger.info(f"Processing image: {image_path}")
        
        # Determine which engine to use
        use_engine = engine or self.default_engine
        
        # Try primary engine
        if use_engine in ['donut', 'auto']:
            result = self._extract_with_donut(image_path)
            if result['success'] or not fallback:
                return result
            logger.warning("Donut OCR failed, trying Tesseract fallback...")
        
        # Try Tesseract (either as primary or fallback)
        if use_engine in ['tesseract', 'auto'] or fallback:
            result = self._extract_with_tesseract(image_path)
            return result
        
        # No engine available
        return {
            "success": False,
            "text": "",
            "structured_data": {},
            "confidence": 0.0,
            "error": "No OCR engine available"
        }
    
    def _extract_with_donut(self, image_path: str) -> Dict[str, Any]:
        """Extract text using Donut transformer"""
        try:
            medical_ocr = self._get_medical_ocr()
            if medical_ocr is None:
                return {
                    "success": False,
                    "text": "",
                    "error": "Medical OCR not available"
                }
            
            # Process with Donut
            result = medical_ocr.process_prescription(
                image_path=image_path,
                validate_type=True
            )
            
            # Extract structured data
            structured_data = {}
            if result["success"] and result["extracted_text"]:
                structured_data = medical_ocr.extract_structured_data(
                    result["extracted_text"]
                )
            
            return {
                "success": result["success"],
                "text": result["extracted_text"],
                "structured_data": structured_data,
                "confidence": result["confidence"],
                "is_prescription": result.get("is_prescription", True),
                "model": "medical-prescription-ocr (donut-transformer)",
                "device": result.get("device", "cpu"),
                "engine": "donut",
                "error": result.get("error")
            }
            
        except Exception as e:
            logger.error(f"Donut OCR failed: {e}")
            return {
                "success": False,
                "text": "",
                "structured_data": {},
                "confidence": 0.0,
                "engine": "donut",
                "error": str(e)
            }
    
    def _extract_with_tesseract(self, image_path: str) -> Dict[str, Any]:
        """Extract text using Tesseract OCR"""
        try:
            tesseract_ocr = self._get_tesseract_ocr()
            if tesseract_ocr is None:
                return {
                    "success": False,
                    "text": "",
                    "error": "Tesseract OCR not available"
                }
            
            # Process with Tesseract
            result = tesseract_ocr.process_image_file(image_path)
            
            return {
                "success": bool(result.get('text')),
                "text": result.get('text', ''),
                "structured_data": {},  # Tesseract doesn't provide structured data
                "confidence": result.get('confidence', 0) / 100.0,  # Convert to 0-1 range
                "is_prescription": True,  # Assume yes
                "model": "tesseract-ocr",
                "engine": "tesseract",
                "word_count": result.get('word_count', 0),
                "processing_time": result.get('processing_time', 0),
                "error": result.get('error')
            }
            
        except Exception as e:
            logger.error(f"Tesseract OCR failed: {e}")
            return {
                "success": False,
                "text": "",
                "structured_data": {},
                "confidence": 0.0,
                "engine": "tesseract",
                "error": str(e)
            }
    
    def process_prescription_image(self, image_path: str, **kwargs) -> Dict[str, Any]:
        """
        Alias for extract_text for backward compatibility
        
        Args:
            image_path: Path to prescription image
            **kwargs: Additional arguments passed to extract_text
            
        Returns:
            OCR result dictionary
        """
        return self.extract_text(image_path, **kwargs)
    
    def compare_engines(self, image_path: str) -> Dict[str, Any]:
        """
        Run both engines and compare results (for testing/evaluation)
        
        Args:
            image_path: Path to image
            
        Returns:
            Comparison results from both engines
        """
        logger.info(f"Comparing OCR engines on: {image_path}")
        
        donut_result = self._extract_with_donut(image_path)
        tesseract_result = self._extract_with_tesseract(image_path)
        
        return {
            "image_path": image_path,
            "donut": donut_result,
            "tesseract": tesseract_result,
            "comparison": {
                "donut_confidence": donut_result.get('confidence', 0),
                "tesseract_confidence": tesseract_result.get('confidence', 0),
                "donut_text_length": len(donut_result.get('text', '')),
                "tesseract_text_length": len(tesseract_result.get('text', '')),
                "recommended": "donut" if donut_result.get('confidence', 0) > tesseract_result.get('confidence', 0) else "tesseract"
            }
        }


# Singleton instance
_hybrid_ocr_service = None

def get_ocr_service() -> HybridOCRService:
    """Get singleton instance of Hybrid OCR Service"""
    global _hybrid_ocr_service
    
    if _hybrid_ocr_service is None:
        _hybrid_ocr_service = HybridOCRService()
    
    return _hybrid_ocr_service
