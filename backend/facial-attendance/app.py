from fastapi import FastAPI, File, UploadFile, HTTPException
from contextlib import asynccontextmanager
import cv2
import numpy as np
from src.face_recognition import recognition_engine

# Import vector_db for direct access
try:
    from src.vector_db import vector_db
except ImportError:
    vector_db = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize recognition engine on startup"""
    # TODO: Load known faces from database
    print("Facial recognition engine initialized")
    yield

app = FastAPI(
    title="Facial Attendance Recognition",
    description="Real-time facial recognition for attendance tracking",
    version="1.0.0",
    lifespan=lifespan
)

@app.get("/")
async def root():
    return {"message": "Facial Recognition Attendance API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "facial-recognition"}

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
                "timestamp": "2024-12-04T10:30:00Z",
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

        # Check if vector database is available
        if vector_db is None:
            raise HTTPException(status_code=503, detail="Vector database not available. Please ensure Qdrant is running.")

        # Enroll face in vector database
        success = vector_db.enroll_user_faces(user_id, [image], user_name=user_name)

        if success:
            # Expose the deterministic Qdrant point ID so other services
            # (e.g. Node/Prisma) can store and later reference/delete it.
            qdrant_id = vector_db._generate_id(user_id)
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
        if vector_db is None:
            raise HTTPException(
                status_code=503,
                detail="Vector database not available. Please ensure Qdrant is running."
            )
        # Get all points from Qdrant to access payload data
        response = vector_db.client.scroll(
            collection_name=vector_db.collection_name,
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
