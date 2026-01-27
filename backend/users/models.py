# WEAV AI Users 앱 모델
# 사용자 프로필

from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """커스텀 User 모델"""

    # Firebase UID (username으로 사용)
    # username = Firebase UID (AbstractUser 상속)

    # 추가 메타데이터
    photo_url = models.URLField(
        blank=True,
        null=True,
        help_text='프로필 사진 URL'
    )
    last_login_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='마지막 로그인 시각'
    )

    class Meta:
        db_table = 'auth_user'
        verbose_name = '사용자'
        verbose_name_plural = '사용자들'

    def __str__(self):
        return f"{self.email or self.username}"
