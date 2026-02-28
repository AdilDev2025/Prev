from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import cv2
import numpy as np
from src.face_recognition import recognition_engine

# Lazy vector_db access – doesn't crash if Qdrant is down at startup
from src.vector_db import _get_vector_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize recognition engine on startup"""
    vdb = _get_vector_db()
    if vdb:
        print("✅ Facial recognition engine initialized with Qdrant")
    else:
        print("⚠️  Facial recognition engine started WITHOUT Qdrant – enroll/recognize will fail until Qdrant is up")
    yield

app = FastAPI(
    title="Facial Attendance Recognition",
    description="Real-time facial recognition for attendance tracking",
    version="1.0.0",
    lifespan=lifespan
)

# Allow the Node.js backend and frontend to call this API directly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Facial Recognition Attendance API", "status": "running"}

@app.get("/health")
async def health_check():
    vdb = _get_vector_db()
    return {
        "status": "healthy",
        "service": "facial-recognition",
        "qdrant_connected": vdb is not None,
    }

@app.post("/attendance-recognition")
async def attendance_recognition(file: UploadFile = File(...)):
    """Main attendance recognition endpoint"""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image")

        result = recognition_engine.recognize_face(image)

        if result.get("recognized"):
            # TODO: Update attendance in your Node.js database
            return {
                "status": "success",
                "user_id": result["user_id"],
                "user_name": result.get("user_name", result["user_id"]),
                "confidence": result["confidence"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message": f"Attendance recorded for user {result.get('user_name', result['user_id'])}"
            }
        else:
            return {
                "status": "failed",
                "message": result.get("message", "Face not recognized"),
                "confidence": 0.0
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recognition error: {str(e)}")

@app.post("/enroll-face")
async def enroll_face(user_id: str, user_name: str = None, file: UploadFile = File(...)):
    """Enroll a new face for recognition"""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image")

        # Check if vector database is available (lazy connect)
        vdb = _get_vector_db()
        if vdb is None:
            raise HTTPException(status_code=503, detail="Vector database not available. Please ensure Qdrant is running on port 6333.")

        # Enroll face in vector database
        success = vdb.enroll_user_faces(user_id, [image], user_name=user_name)

        if success:
            qdrant_id = vdb._generate_id(user_id)
            return {
                "status": "success",
                "message": f"Face enrolled for user {user_name or user_id}",
                "user_id": user_id,
                "user_name": user_name or user_id,
                "qdrant_id": qdrant_id
            }
        else:
            raise HTTPException(status_code=400, detail="Could not enroll face - no valid faces detected")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enrollment error: {str(e)}")

@app.get("/enrolled-users")
async def get_enrolled_users():
    """Get list of enrolled users"""
    try:
        vdb = _get_vector_db()
        if vdb is None:
            raise HTTPException(
                status_code=503,
                detail="Vector database not available. Please ensure Qdrant is running."
            )
        # Get all points from Qdrant to access payload data
        response = vdb.client.scroll(
            collection_name=vdb.collection_name,
            limit=1000
        )

        users = []
        for point in response[0]:
            users.append({
                "user_id": point.payload.get("user_id"),
                "user_name": point.payload.get("user_name", point.payload.get("user_id"))
            })

        return {
            "status": "success",
            "enrolled_users": users,
            "count": len(users)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving users: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
