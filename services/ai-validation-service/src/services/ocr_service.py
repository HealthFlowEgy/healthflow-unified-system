import os
import cv2
import numpy as np
import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import logging
from typing import Dict, List, Optional, Tuple, Union
import json
from datetime import datetime
import tempfile
import base64

# Configure logging
logger = logging.getLogger(__name__)

class OCRService:
    """
    Integrated OCR service combining features from Pharmacy_AI and medical-data-extraction projects
    Optimized for medical prescription processing
    """
    
    def __init__(self):
        """Initialize the OCR service"""
        self.setup_tesseract()
        logger.info("OCR Service initialized")
    
    def setup_tesseract(self):
        """Setup Tesseract OCR configuration"""
        # Try to find Tesseract executable
        tesseract_paths = [
            '/usr/bin/tesseract',
            '/usr/local/bin/tesseract',
            '/opt/homebrew/bin/tesseract',
            'tesseract'  # System PATH
        ]
        
        for path in tesseract_paths:
            try:
                # Test if tesseract is available at this path
                import subprocess
                result = subprocess.run([path, '--version'], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    pytesseract.pytesseract.tesseract_cmd = path
                    logger.info(f"Tesseract found at: {path}")
                    return
            except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
                continue
        
        logger.warning("Tesseract not found in common locations, using system default")
    
    def preprocess_image_adaptive(self, image: np.ndarray) -> np.ndarray:
        """
        Apply adaptive preprocessing optimized for medical documents
        Based on medical-data-extraction approach with enhancements
        """
        try:
            # Convert to grayscale if needed
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image.copy()
            
            # Resize for better OCR accuracy
            height, width = gray.shape
            if height < 1000 or width < 1000:
                scale_factor = max(1000/height, 1000/width, 1.5)
                new_width = int(width * scale_factor)
                new_height = int(height * scale_factor)
                resized = cv2.resize(gray, (new_width, new_height), 
                                   interpolation=cv2.INTER_CUBIC)
            else:
                resized = gray
            
            # Apply adaptive thresholding optimized for medical documents
            processed = cv2.adaptiveThreshold(
                resized,
                255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                65,  # block size (optimized for medical text)
                13   # constant (optimized for medical text)
            )
            
            # Additional noise reduction
            kernel = np.ones((2, 2), np.uint8)
            processed = cv2.morphologyEx(processed, cv2.MORPH_CLOSE, kernel)
            processed = cv2.medianBlur(processed, 3)
            
            return processed
            
        except Exception as e:
            logger.error(f"Error in adaptive preprocessing: {str(e)}")
            return gray if 'gray' in locals() else image
    
    def preprocess_image_enhanced(self, image: np.ndarray) -> np.ndarray:
        """
        Enhanced preprocessing with multiple techniques
        Based on Pharmacy_AI approach
        """
        try:
            # Convert to grayscale
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image.copy()
            
            # Contrast enhancement using CLAHE
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            
            # Noise reduction
            denoised = cv2.GaussianBlur(enhanced, (3, 3), 0)
            
            # Sharpening
            kernel = np.array([[-1, -1, -1],
                             [-1,  9, -1],
                             [-1, -1, -1]])
            sharpened = cv2.filter2D(denoised, -1, kernel)
            
            # Binarization
            _, binary = cv2.threshold(sharpened, 0, 255, 
                                    cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            return binary
            
        except Exception as e:
            logger.error(f"Error in enhanced preprocessing: {str(e)}")
            return gray if 'gray' in locals() else image
    
    def deskew_image(self, image: np.ndarray) -> np.ndarray:
        """
        Deskew image to correct rotation
        """
        try:
            # Convert to binary if not already
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image.copy()
            
            # Threshold
            thresh = cv2.threshold(gray, 0, 255, 
                                 cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
            
            # Find contours
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, 
                                         cv2.CHAIN_APPROX_SIMPLE)
            
            if not contours:
                return image
            
            # Find the largest contour (likely the document)
            largest_contour = max(contours, key=cv2.contourArea)
            
            # Get minimum area rectangle
            rect = cv2.minAreaRect(largest_contour)
            angle = rect[2]
            
            # Correct angle
            if angle < -45:
                angle = 90 + angle
            elif angle > 45:
                angle = -90 + angle
            
            # Only deskew if angle is significant
            if abs(angle) > 0.5:
                (h, w) = image.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                rotated = cv2.warpAffine(image, M, (w, h),
                                       flags=cv2.INTER_CUBIC,
                                       borderMode=cv2.BORDER_REPLICATE)
                return rotated
            
            return image
            
        except Exception as e:
            logger.error(f"Error deskewing image: {str(e)}")
            return image
    
    def extract_text_from_image(self, image: np.ndarray, 
                               preprocessing_method: str = 'adaptive') -> Dict:
        """
        Extract text from image using OCR
        
        Args:
            image: Input image as numpy array
            preprocessing_method: 'adaptive' or 'enhanced'
            
        Returns:
            Dictionary containing extracted text and metadata
        """
        try:
            start_time = datetime.now()
            
            # Apply preprocessing
            if preprocessing_method == 'adaptive':
                processed = self.preprocess_image_adaptive(image)
            else:
                processed = self.preprocess_image_enhanced(image)
            
            # Deskew if needed
            deskewed = self.deskew_image(processed)
            
            # OCR configuration optimized for medical text
            custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,;:()[]{}/-+*=@#$%^&!? '
            
            # Extract text
            text = pytesseract.image_to_string(deskewed, lang='eng', 
                                             config=custom_config)
            
            # Get detailed data with confidence scores
            data = pytesseract.image_to_data(deskewed, lang='eng', 
                                           config=custom_config,
                                           output_type=pytesseract.Output.DICT)
            
            # Calculate confidence metrics
            confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            # Extract words with positions and confidence
            words = []
            for i in range(len(data['text'])):
                if int(data['conf'][i]) > 30:  # Filter low confidence words
                    word_info = {
                        'text': data['text'][i].strip(),
                        'confidence': int(data['conf'][i]),
                        'bbox': {
                            'x': data['left'][i],
                            'y': data['top'][i],
                            'width': data['width'][i],
                            'height': data['height'][i]
                        }
                    }
                    if word_info['text']:  # Only add non-empty words
                        words.append(word_info)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            result = {
                'text': text.strip(),
                'confidence': round(avg_confidence, 2),
                'word_count': len(words),
                'words': words,
                'processing_time': round(processing_time, 3),
                'preprocessing_method': preprocessing_method,
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"OCR completed in {processing_time:.3f}s with {avg_confidence:.1f}% confidence")
            return result
            
        except Exception as e:
            logger.error(f"Error in OCR processing: {str(e)}")
            return {
                'text': '',
                'confidence': 0,
                'word_count': 0,
                'words': [],
                'processing_time': 0,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def process_pdf_file(self, pdf_path: str) -> Dict:
        """
        Process PDF file by converting to images and applying OCR
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            Dictionary containing OCR results for all pages
        """
        try:
            # Convert PDF to images
            pages = convert_from_path(pdf_path, dpi=300)
            
            results = {
                'pages': [],
                'combined_text': '',
                'total_pages': len(pages),
                'processing_time': 0
            }
            
            start_time = datetime.now()
            
            for page_num, page in enumerate(pages, 1):
                # Convert PIL image to numpy array
                page_array = np.array(page)
                
                # Process page with both methods and choose best result
                adaptive_result = self.extract_text_from_image(page_array, 'adaptive')
                enhanced_result = self.extract_text_from_image(page_array, 'enhanced')
                
                # Choose result with higher confidence
                if adaptive_result['confidence'] >= enhanced_result['confidence']:
                    page_result = adaptive_result
                else:
                    page_result = enhanced_result
                
                page_result['page_number'] = page_num
                results['pages'].append(page_result)
                results['combined_text'] += f"\\n--- Page {page_num} ---\\n{page_result['text']}\\n"
            
            results['processing_time'] = (datetime.now() - start_time).total_seconds()
            
            # Calculate overall statistics
            total_confidence = sum(page['confidence'] for page in results['pages'])
            results['average_confidence'] = total_confidence / len(results['pages']) if results['pages'] else 0
            results['total_words'] = sum(page['word_count'] for page in results['pages'])
            
            logger.info(f"PDF processing completed: {len(pages)} pages in {results['processing_time']:.3f}s")
            return results
            
        except Exception as e:
            logger.error(f"Error processing PDF {pdf_path}: {str(e)}")
            return {
                'pages': [],
                'combined_text': '',
                'total_pages': 0,
                'processing_time': 0,
                'error': str(e)
            }
    
    def process_image_file(self, image_path: str) -> Dict:
        """
        Process image file
        
        Args:
            image_path: Path to image file
            
        Returns:
            Dictionary containing OCR results
        """
        try:
            # Read image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not read image at {image_path}")
            
            # Process with both methods and return best result
            adaptive_result = self.extract_text_from_image(image, 'adaptive')
            enhanced_result = self.extract_text_from_image(image, 'enhanced')
            
            # Choose result with higher confidence
            if adaptive_result['confidence'] >= enhanced_result['confidence']:
                result = adaptive_result
            else:
                result = enhanced_result
            
            result['file_path'] = image_path
            result['file_type'] = 'image'
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing image {image_path}: {str(e)}")
            return {
                'text': '',
                'confidence': 0,
                'word_count': 0,
                'words': [],
                'processing_time': 0,
                'error': str(e),
                'file_path': image_path,
                'file_type': 'image'
            }
    
    def process_file(self, file_path: str) -> Dict:
        """
        Process file (PDF or image) automatically detecting type
        
        Args:
            file_path: Path to file
            
        Returns:
            Dictionary containing OCR results
        """
        try:
            file_extension = os.path.splitext(file_path)[1].lower()
            
            if file_extension == '.pdf':
                return self.process_pdf_file(file_path)
            elif file_extension in ['.jpg', '.jpeg', '.png', '.tiff', '.bmp']:
                return self.process_image_file(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_extension}")
                
        except Exception as e:
            logger.error(f"Error processing file {file_path}: {str(e)}")
            return {
                'error': str(e),
                'file_path': file_path
            }
    
    def save_ocr_results(self, results: Dict, output_path: str) -> str:
        """
        Save OCR results to file
        
        Args:
            results: OCR results dictionary
            output_path: Path to save results
            
        Returns:
            Path to saved file
        """
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
            
            logger.info(f"OCR results saved to: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error saving OCR results: {str(e)}")
            raise

# Convenience function for external use
def extract_text_from_file(file_path: str) -> Dict:
    """
    Extract text from file using OCR
    
    Args:
        file_path: Path to file (PDF or image)
        
    Returns:
        Dictionary containing extracted text and metadata
    """
    ocr_service = OCRService()
    return ocr_service.process_file(file_path)

