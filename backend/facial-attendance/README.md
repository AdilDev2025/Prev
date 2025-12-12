# Facial Attendance Recognition System

Real-time facial recognition system for attendance tracking using vector database.

## 🏗️ Architecture

- **FastAPI**: Web framework for API endpoints
- **Face Recognition**: Face detection and embedding extraction using DLIB
- **Qdrant Vector DB**: Persistent storage for 128D face embeddings in "faces" collection
- **Docker**: Containerized deployment with separate services

## 🚀 Quick Start

### 1. Setup Vector Database
```bash
cd facial-attendance

# Start Qdrant vector database
./start_qdrant.sh

# Verify Qdrant is running
curl http://localhost:6333/health
```

### 2. Install Dependencies
```bash
# Activate virtual environment
source venv/bin/activate

# Install required packages
pip install face-recognition qdrant-client
```

### 3. Train Model
```bash
# Train on LFW dataset (5,761 users)
python scripts/train_model.py
```

### 4. Test Integration
```bash
# Test Qdrant integration
python test_qdrant_integration.py

# Test recognition API
python scripts/test_recognition.py
```

### 2. Health Check
```bash
# API health
curl http://localhost:8000/health

# Vector database health
curl http://localhost:6333/health
```

### 3. Prepare Training Data
```bash
# Create directories for users
mkdir -p data/training_data/john_doe
mkdir -p data/training_data/jane_smith

# Add 5-10 clear face photos per user
# Photos should be: front-facing, good lighting, no sunglasses
```

### 4. Train Model
```bash
# Run training script
docker-compose exec facial-recognition python scripts/train_model.py
```

### 5. Test Recognition
```bash
# Test with training images
docker-compose exec facial-recognition python scripts/test_recognition.py

# Or use API directly
curl -X POST "http://localhost:8000/attendance-recognition" \
  -F "file=@test_image.jpg"
```

## 📡 API Endpoints

### Health & Status
- `GET /health` - Service health check
- `GET /enrolled-users` - List enrolled users

## 🗄️ Qdrant Collection Structure

### "faces" Collection
- **Vectors**: 128D face embeddings (float32)
- **Distance**: Cosine similarity
- **Payload Structure**:
```json
{
  "user_id": "john_doe",
  "user_name": "John Doe",
  "embedding_type": "face",
  "created_at": "2024-12-04T10:00:00Z",
  "enrollment_date": "2024-12-04",
  "num_samples": 3
}
```

### Face Operations
- `POST /attendance-recognition` - Recognize face in image
- `POST /enroll-face?user_id={id}&user_name={name}` - Enroll new face

### Examples

#### Enroll Face
```bash
curl -X POST "http://localhost:8000/enroll-face?user_id=john_doe&user_name=John%20Doe" \
  -F "file=@john_photo.jpg"
```

#### Recognize Face
```bash
curl -X POST "http://localhost:8000/attendance-recognition" \
  -F "file=@unknown_person.jpg"
```

Response:
```json
{
  "status": "success",
  "user_id": "john_doe",
  "user_name": "John Doe",
  "confidence": 0.89,
  "method": "vector_db",
  "timestamp": "2024-12-04T10:30:00Z"
}
```

## 🔧 Development

### Local Testing (without Docker)
```bash
# Install dependencies
pip install -r requirements.txt

# Start Qdrant (in another terminal)
docker run -p 6333:6333 qdrant/qdrant

# Run API server
python app.py

# Train model
python scripts/train_model.py

# Test recognition
python scripts/test_recognition.py
```

### Docker Development
```bash
# Rebuild after code changes
docker-compose up --build

# View logs
docker-compose logs -f facial-recognition

# Access container shell
docker-compose exec facial-recognition bash
```

## 📁 Project Structure

```
facial-attendance/
├── app.py                 # FastAPI application
├── src/
│   ├── face_recognition.py    # Face detection & recognition
│   ├── vector_db.py          # Qdrant integration
│   └── data_augmentation.py  # Image enhancement
├── scripts/
│   ├── train_model.py        # Training script
│   └── test_recognition.py   # Testing script
├── data/
│   ├── training_data/        # Training images
│   └── models/              # Model files (if needed)
├── Dockerfile              # Container definition
├── docker-compose.yml     # Multi-service setup
└── requirements.txt       # Python dependencies
```

## 🎯 Key Features

- **Real-time Recognition**: < 2 second response time
- **Vector Similarity**: Advanced face matching using DLIB embeddings
- **Qdrant Integration**: Persistent storage in "faces" collection
- **User Metadata**: Links embeddings to user IDs and names
- **Auto Collection Creation**: Creates "faces" collection automatically
- **Data Augmentation**: Enhanced recognition with image variations
- **Scalability**: Handle thousands of users
- **RESTful API**: Easy integration with existing systems

## 🔍 Troubleshooting

### Common Issues

1. **"No faces detected"**
   - Ensure clear, well-lit face photos
   - Remove sunglasses/glasses from training images

2. **Low confidence scores**
   - Add more training images (5-10 per person)
   - Ensure consistent lighting/angles

3. **Docker build fails**
   - Check available disk space
   - Ensure Docker Desktop is running

4. **Qdrant connection errors**
   - Verify Qdrant container is running: `docker-compose ps`
   - Check logs: `docker-compose logs qdrant`

### Debug Commands

```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs facial-recognition
docker-compose logs qdrant

# Restart services
docker-compose restart

# Clean rebuild
docker-compose down
docker-compose up --build
```

## 🚀 Production Deployment

1. **Environment Variables**
   ```bash
   NODEJS_API_URL=https://your-api.com
   QDRANT_URL=http://qdrant:6333
   ```

2. **Persistent Storage**
   ```yaml
   volumes:
     - ./data:/app/data
     - qdrant_data:/qdrant/storage
   ```

3. **Health Monitoring**
   - Monitor API response times
   - Track recognition accuracy
   - Alert on high error rates

## 📈 Performance Metrics

- **Recognition Time**: ~500ms - 1.5s
- **Accuracy**: >90% with good training data
- **Storage**: ~128KB per enrolled user
- **Concurrent Requests**: 10-50 req/min (depends on hardware)

---

## 🧪 Testing Checklist

- [ ] Docker containers build successfully
- [ ] Health endpoints return 200 OK
- [ ] Face enrollment works with sample images
- [ ] Recognition returns correct user IDs
- [ ] Confidence scores > 0.8 for known faces
- [ ] Unknown faces return "not recognized"
- [ ] Multiple faces in image handled correctly
