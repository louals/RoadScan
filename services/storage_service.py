import os
import uuid
import io
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

load_dotenv()

# Configure Cloudinary credentials from environment variables
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

class StorageService:
    @staticmethod
    def upload_road_image(file_bytes: bytes, filename: str) -> str:
        """
        Uploads raw image bytes to Cloudinary under the 'road-images' folder,
        generates a unique filename, and returns the secure public URL.
        """
        try:
            # Extract file extension safely or default to jpg
            file_extension = filename.split(".")[-1] if "." in filename else "jpg"
            unique_filename = f"{uuid.uuid4()}"
            
            print(f"Attempting upload to Cloudinary folder 'road-images': {unique_filename}.{file_extension}")

            # Upload raw bytes using BytesIO for safe handling
            response = cloudinary.uploader.upload(
                io.BytesIO(file_bytes),
                folder="road-images",
                public_id=unique_filename,
                resource_type="image"
            )

            # Retrieve the secure public URL for the uploaded asset
            secure_url = response.get("secure_url")
            print(f"Upload successful! Public URL: {secure_url}")
            
            return secure_url
            
        except Exception as e:
            print(f"❌ Cloudinary storage upload error: {str(e)}")
            return "pending_storage_url"  # Fallback gracefully if upload fails

# Singleton instance for dependency usage across routers
storage_service = StorageService()