export const MODEL_CONFIGS = {
    videoPro: {
        id: 'fal-ai/sora-2/text-to-video',
        name: 'Video Pro',
        styles: [
            { id: 'realistic', name: '실사화 (Photorealistic)', desc: '현실과 구분이 어려운 초고해상도 실사 스타일', previewImage: '' },
            { id: 'cinematic', name: '시네마틱 (Cinematic)', desc: '영화 같은 조명과 색감', previewImage: '' },
            { id: '3d-animation', name: '3D 애니메이션', desc: '고품질 3D 렌더링 스타일', previewImage: '' },
            { id: 'anime', name: '애니메이션 (Anime)', desc: '애니메이션 작화 스타일', previewImage: '' },
            { id: 'fantasy', name: '판타지 (Fantasy)', desc: '몽환적이고 초현실적인 분위기', previewImage: '' },
        ],
        durations: ['4', '8', '12'],
        resolutions: ['720p'],
        aspectRatios: ['16:9', '9:16'],
        maxDuration: 12
    }
} as const;
