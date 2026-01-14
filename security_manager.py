import os
from cryptography.fernet import Fernet
import json
import base64

class SecurityManager:
    def __init__(self, key_file="secret.key"):
        self.key_file = key_file
        self.key = self.load_key()
        self.cipher = Fernet(self.key)

    def load_key(self):
        if os.path.exists(self.key_file):
            with open(self.key_file, "rb") as key_file:
                return key_file.read()
        else:
            key = Fernet.generate_key()
            with open(self.key_file, "wb") as key_file:
                key_file.write(key)
            return key

    def encrypt_data(self, data):
        """Encrypts a string or bytes. Returns bytes."""
        if isinstance(data, str):
            data = data.encode()
        return self.cipher.encrypt(data)

    def decrypt_data(self, encrypted_data):
        """Decrypts bytes. Returns string."""
        return self.cipher.decrypt(encrypted_data).decode()

    def encrypt_file(self, file_path):
        """Encrypts a file in place."""
        with open(file_path, "rb") as f:
            data = f.read()
        encrypted_data = self.encrypt_data(data)
        with open(file_path, "wb") as f:
            f.write(encrypted_data)

    def decrypt_file(self, file_path):
        """Decrypts a file in place."""
        with open(file_path, "rb") as f:
            data = f.read()
        decrypted_data = self.cipher.decrypt(data)
        with open(file_path, "wb") as f:
            f.write(decrypted_data)

    def save_json_encrypted(self, data, file_path):
        """Saves a dict as an encrypted JSON file."""
        json_str = json.dumps(data, indent=4)
        encrypted_data = self.encrypt_data(json_str)
        with open(file_path, "wb") as f:
            f.write(encrypted_data)

    def load_json_encrypted(self, file_path, default=None):
        """Loads a dict from an encrypted JSON file. Handles unencrypted fallback."""
        if not os.path.exists(file_path):
            return default if default is not None else {}
        
        try:
            with open(file_path, "rb") as f:
                content = f.read()
            
            # Try decrypting first
            try:
                decrypted_json = self.decrypt_data(content)
                return json.loads(decrypted_json)
            except Exception:
                # Fallback: maybe it's plain JSON (legacy support)
                return json.loads(content.decode())
        except Exception as e:
            print(f"Error loading {file_path}: {e}")
            return default if default is not None else {}
