from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import asyncio
import logging

from app.services.deberta_service import deberta_service
from app.services.groq_service import groq_service
from app.services.gemini_service import gemini_service
from app.services.translation_service import translation_service

logger = logging.getLogger(__name__)
router = APIRouter()

class PipelineRequest(BaseModel):
    text: str

class PipelineResponse(BaseModel):
    severity: str
    reply: str
    summary: str
    intent: str
    confidence: float
    emotion: str

class TextInputRequest(BaseModel):
    text: str
    originalText: str = ""

@router.post("/analyze", response_model=PipelineResponse)
async def analyze_pipeline(request: PipelineRequest):
    """
    Unified Pipeline endpoint combining:
    1. DeBERTa model for Severity Classification
    2. Gemini API for generating a context-aware safe reply
    3. Groq API for generating a 1-2 line case summary
    4. DeBERTa dynamic classification for intent & confidence
    5. DeBERTa zero-shot emotion classifier
    """
    try:
        # Run all AI tasks concurrently to drastically minimize total latency
        severity_task = asyncio.create_task(deberta_service.detect_severity(request.text))
        reply_task = asyncio.create_task(gemini_service.generate_reply(request.text))
        summary_task = asyncio.create_task(groq_service.generate_summary(request.text))
        intent_task = asyncio.create_task(deberta_service.analyze_text(request.text))
        emotion_task = asyncio.create_task(deberta_service.detect_emotion(request.text))

        severity, reply, summary, intent_result, emotion = await asyncio.gather(
            severity_task,
            reply_task,
            summary_task,
            intent_task,
            emotion_task
        )

        return PipelineResponse(
            severity=severity,
            reply=reply,
            summary=summary,
            intent=intent_result.get("intent", "General Enquiry"),
            confidence=float(intent_result.get("confidence", 0.85)),
            emotion=emotion
        )

    except Exception as e:
        logger.error(f"Error in analyze_pipeline: {e}")
        raise HTTPException(status_code=500, detail=f"Pipeline processing failed: {str(e)}")

@router.post("/input")
async def pipeline_input(request: TextInputRequest):
    """
    Language detection and translation pipeline endpoint from input-service.
    """
    text = request.text.strip()
    original = request.originalText.strip()

    # Edge case 1 — Empty text
    if not text and not original:
        raise HTTPException(
            status_code=400,
            detail="No text provided. Please send valid input."
        )

    # Edge case 2 — Only numbers/symbols
    working_text = original or text
    if working_text.replace(" ", "").isnumeric():
        return {
            "text": working_text,
            "language": "English",
            "originalText": working_text,
            "warning": "Input contains only numbers"
        }

    # Edge case 3 — Too short (less than 2 chars)
    if len(working_text) < 2:
        raise HTTPException(
            status_code=400,
            detail="Input too short. Please describe your emergency."
        )

    try:
        language = translation_service.detect_language(working_text)
        translated_text = await translation_service.translate_to_english(
            working_text, language
        )

        # Edge case 4 — Translation returned empty
        if not translated_text or translated_text.strip() == "":
            translated_text = working_text

        # Edge case 5 — Unknown language (translation same as input)
        if translated_text == working_text and language != "English":
            language = "Unknown"

        return {
            "text": translated_text,
            "language": language,
            "originalText": working_text
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Pipeline input error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Service error. Please try again."
        )

