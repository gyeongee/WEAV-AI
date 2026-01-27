# WEAV AI FAL.ai 클라이언트
# fal.run HTTP API 기반 텍스트/이미지/비디오 생성

import os
from typing import Dict, Any
import requests
from .schemas import TextGenerationRequest, ImageGenerationRequest, VideoGenerationRequest
from .errors import AIProviderError, AIRequestError, AIQuotaExceededError


class FalClient:
    """FAL.ai API 클라이언트"""

    def __init__(self):
        api_key = os.getenv('FAL_KEY')
        if not api_key:
            raise AIProviderError('fal', 'FAL_KEY 환경변수가 설정되지 않았습니다')

        self.api_key = api_key
        self.base_url = os.getenv('FAL_BASE_URL', 'https://fal.run').rstrip('/')
        self.text_endpoint = os.getenv('FAL_TEXT_ENDPOINT', 'fal-ai/any-llm').lstrip('/')
        self.default_text_model = os.getenv('FAL_TEXT_DEFAULT_MODEL', 'openai/gpt-4o-mini')


    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Key {self.api_key}",
            "Content-Type": "application/json",
        }

    def _post(self, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        response = requests.post(url, headers=self._headers(), json=payload, timeout=60)

        if response.status_code == 401:
            raise AIProviderError('fal', 'FAL API 키가 유효하지 않습니다', status_code=401)
        if response.status_code == 429:
            raise AIQuotaExceededError('fal')
        if response.status_code >= 400:
            raise AIRequestError('fal', f'FAL 요청 실패: {response.text}', response.status_code)

        try:
            data = response.json()
        except Exception:
            raise AIRequestError('fal', 'FAL 응답을 JSON으로 파싱할 수 없습니다', 500)
        if data is None:
            raise AIRequestError('fal', 'FAL 응답이 비어있습니다', 502)
        return data

    def _extract_image_url(self, data: Dict[str, Any]) -> str:
        if isinstance(data, dict):
            if isinstance(data.get('images'), list) and data['images']:
                first = data['images'][0]
                if isinstance(first, dict) and first.get('url'):
                    return first['url']
                if isinstance(first, str):
                    return first
            if isinstance(data.get('image'), dict) and data['image'].get('url'):
                return data['image']['url']
            if isinstance(data.get('urls'), list) and data['urls']:
                return data['urls'][0]
            if isinstance(data.get('output'), str) and data['output'].startswith('http'):
                return data['output']
        raise AIRequestError('fal', '이미지 URL을 찾을 수 없습니다', 500)

    def _extract_video_url(self, data: Dict[str, Any]) -> str:
        if isinstance(data, dict):
            if isinstance(data.get('videos'), list) and data['videos']:
                first = data['videos'][0]
                if isinstance(first, dict) and first.get('url'):
                    return first['url']
                if isinstance(first, str):
                    return first
            if isinstance(data.get('video'), dict) and data['video'].get('url'):
                return data['video']['url']
            if isinstance(data.get('urls'), list) and data['urls']:
                return data['urls'][0]
            if isinstance(data.get('output'), str) and data['output'].startswith('http'):
                return data['output']
        raise AIRequestError('fal', '비디오 URL을 찾을 수 없습니다', 500)

    def generate_text(self, request: TextGenerationRequest) -> Dict[str, Any]:
        fal_model = request.model or self.default_text_model

        payload = {
            "prompt": request.input_text,
            "system_prompt": request.system_prompt,
            "temperature": request.temperature,
            "max_tokens": request.max_output_tokens,
            "model": fal_model,
        }
        # 불필요한 None 제거
        payload = {k: v for k, v in payload.items() if v is not None}

        data = self._post(self.text_endpoint, payload)
        output = data.get('output') or data.get('text')
        if not output:
            raise AIRequestError('fal', '텍스트 응답이 비어있습니다', 500)

        return {
            "provider": "fal",
            "model": fal_model,
            "text": output,
            "usage": data.get('usage'),
            "finish_reason": data.get('finish_reason'),
        }

    def generate_image(self, request: ImageGenerationRequest) -> Dict[str, Any]:
        model = request.model
        endpoint = model or None
        if not endpoint:
            raise AIRequestError('fal', '지원하지 않는 이미지 모델', 400)

        payload = {
            "prompt": request.prompt,
        }
        data = self._post(endpoint, payload)
        url = self._extract_image_url(data)

        return {
            "provider": "fal",
            "model": endpoint,
            "url": url,
        }

    def generate_video(self, request: VideoGenerationRequest) -> Dict[str, Any]:
        model = request.model
        endpoint = model or None
        if not endpoint:
            raise AIRequestError('fal', '지원하지 않는 비디오 모델', 400)

        payload = {
            "prompt": request.prompt,
        }
        data = self._post(endpoint, payload)
        url = self._extract_video_url(data)

        return {
            "provider": "fal",
            "model": endpoint,
            "url": url,
        }
