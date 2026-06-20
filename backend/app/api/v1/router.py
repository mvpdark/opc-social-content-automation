from fastapi import APIRouter

from app.api.v1.endpoints import auth, content, images, workspace

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(content.router, prefix="/content", tags=["content"])
api_router.include_router(images.router, prefix="/image", tags=["images"])
api_router.include_router(workspace.router, prefix="/workspace", tags=["workspace"])
