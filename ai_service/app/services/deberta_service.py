from typing import Dict, Any
from app.core.config import settings
from transformers import pipeline
import logging
import asyncio
import torch

logger = logging.getLogger(__name__)

class DebertaService:
    def __init__(self):
        self.model_name = settings.DEBERTA_MODEL_NAME
        
        try:
            # Use GPU if available to speed up inference significantly
            device = 0 if torch.cuda.is_available() else -1
            logger.info(f"Loading Zero-Shot Classification model: {self.model_name} on device: {'GPU' if device == 0 else 'CPU'}")
            self.classifier = pipeline(
                "zero-shot-classification", 
                model=self.model_name,
                device=device
            )
        except Exception as e:
            logger.error(f"Failed to load model {self.model_name}: {e}")
            self.classifier = None

        self.labels = [
            "Emergency",
            "Enquiry",
            "Harassment",
            "Infrastructure",
            "Medical"
        ]

        self.severity_labels = [
            "LOW",
            "MEDIUM",
            "HIGH",
            "CRITICAL"
        ]

        # For mapping the detected generic label to a specific intent
        self.intent_labels = [
            "Police Emergency",
            "Fire Emergency",
            "Medical Emergency",
            "Women Safety",
            "Infrastructure Complaint",
            "General Enquiry"
        ]

        self.intent_to_top_label = {
            "Police Emergency": "Emergency",
            "Fire Emergency": "Emergency",
            "Women Safety": "Harassment",
            "Medical Emergency": "Medical",
            "Infrastructure Complaint": "Infrastructure",
            "General Enquiry": "Enquiry"
        }

    def _fallback_analyze(self, text: str) -> Dict[str, Any]:
        text_lower = text.lower()
        if any(word in text_lower for word in ["robbery", "murder", "attack", "kidnap", "fight", "violence"]):
            return {"top_label": "Emergency", "scores": {"Emergency": 0.95, "Infrastructure": 0.02, "Enquiry": 0.03}, "intent": "Police Emergency", "confidence": 0.95}
        elif any(word in text_lower for word in ["harassment", "stalking", "abuse"]):
            return {"top_label": "Harassment", "scores": {"Harassment": 0.94, "Emergency": 0.04, "Enquiry": 0.02}, "intent": "Women Safety", "confidence": 0.94}
        elif any(word in text_lower for word in ["fire", "burning", "smoke"]):
            return {"top_label": "Emergency", "scores": {"Emergency": 0.96, "Infrastructure": 0.02, "Enquiry": 0.02}, "intent": "Fire Emergency", "confidence": 0.96}
        elif any(word in text_lower for word in ["ambulance", "medical", "accident", "injured"]):
            return {"top_label": "Medical", "scores": {"Medical": 0.97, "Emergency": 0.02, "Enquiry": 0.01}, "intent": "Medical Emergency", "confidence": 0.97}
        elif any(word in text_lower for word in ["water leakage", "road damage", "garbage"]):
            return {"top_label": "Infrastructure", "scores": {"Infrastructure": 0.92, "Emergency": 0.05, "Enquiry": 0.03}, "intent": "Infrastructure Complaint", "confidence": 0.92}
        else:
            return {"top_label": "Enquiry", "scores": {"Enquiry": 0.85, "Emergency": 0.10, "Infrastructure": 0.05}, "intent": "General Enquiry", "confidence": 0.85}

    async def analyze_text(self, text: str) -> Dict[str, Any]:
        """
        Dynamic zero-shot classification for emergency routing
        """
        if not self.classifier:
            logger.warning("Classifier not loaded, using fallback.")
            return self._fallback_analyze(text)

        try:
            # Classify over intents using a thread pool so it doesn't block the FastAPI async event loop
            result = await asyncio.to_thread(
                self.classifier, 
                text, 
                candidate_labels=self.intent_labels
            )
            
            intent = result['labels'][0]
            confidence = result['scores'][0]
            top_label = self.intent_to_top_label.get(intent, "Enquiry")
            
            # Calculate scores for top_labels
            scores = {label: 0.0 for label in self.labels}
            for label, score in zip(result['labels'], result['scores']):
                tl = self.intent_to_top_label.get(label, "Enquiry")
                if tl in scores:
                    scores[tl] += score
                    
            # If the model is not very confident, default to General Enquiry
            CONFIDENCE_THRESHOLD = 0.35
            if confidence < CONFIDENCE_THRESHOLD:
                return self._fallback_analyze(text)
                    
            return {
                "top_label": top_label,
                "scores": scores,
                "intent": intent,
                "confidence": confidence
            }
        except Exception as e:
            logger.error(f"Error in analyze_text: {e}")
            return self._fallback_analyze(text)

    def _fallback_severity(self, text: str) -> str:
        text_lower = text.lower()
        if any(word in text_lower for word in ["murder", "fire", "kidnap", "terror", "gun", "killing", "bomb", "dying", "dead"]):
            return "CRITICAL"
        elif any(word in text_lower for word in ["robbery", "attack", "accident", "injured", "hurting", "hitting", "beating", "hurt", "help me", "save me"]):
            return "HIGH"
        elif any(word in text_lower for word in ["harassment", "stalking", "abuse", "threatening"]):
            return "MEDIUM"
        return "LOW"

    async def detect_severity(self, text: str) -> str:
        """
        Detect severity from LOW to CRITICAL using zero-shot classification
        """
        if not self.classifier:
            return self._fallback_severity(text)
            
        try:
            # Run in a separate thread
            result = await asyncio.to_thread(
                self.classifier,
                text,
                candidate_labels=self.severity_labels
            )
            return result['labels'][0]
        except Exception as e:
            logger.error(f"Error in detect_severity: {e}")
            return self._fallback_severity(text)

    def _fallback_emotion(self, text: str) -> str:
        text_lower = text.lower()
        if any(word in text_lower for word in ["help", "please", "save", "kill", "fire", "danger", "dying"]):
            return "PANIC"
        elif any(word in text_lower for word in ["scared", "fear", "afraid", "scare"]):
            return "FEAR"
        elif any(word in text_lower for word in ["angry", "shout", "mad", "worst", "hate"]):
            return "ANGER"
        elif any(word in text_lower for word in ["what", "why", "how", "where", "confused", "question"]):
            return "CONFUSED"
        elif any(word in text_lower for word in ["sad", "crying", "pain", "hurt", "unhappy"]):
            return "SAD"
        return "NEUTRAL"

    async def detect_emotion(self, text: str) -> str:
        """
        Detect emotion using zero-shot classification
        """
        if not self.classifier:
            return self._fallback_emotion(text)

        try:
            emotions = ["PANIC", "FEAR", "ANGER", "CONFUSED", "NEUTRAL", "SAD"]
            result = await asyncio.to_thread(
                self.classifier,
                text,
                candidate_labels=emotions
            )
            return result['labels'][0]
        except Exception as e:
            logger.error(f"Error in detect_emotion: {e}")
            return self._fallback_emotion(text)

deberta_service = DebertaService()