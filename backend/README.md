# PedolOne Authentication Backend

A secure authentication system with email and phone verification using FastAPI, MongoDB, and Twilio.

## Features

- **User Registration**: Email, phone number, and password-based registration
- **Dual Verification**: Both email and phone number verification required
- **OTP Verification**: 6-digit OTP sent via email (SMTP) and SMS (Twilio)
- **Login Security**: Each login requires either email or phone OTP verification
- **Auto Cleanup**: Unverified users are automatically deleted after 15 minutes
- **Password Security**: Bcrypt hashing with strong password requirements
- **MongoDB Integration**: Secure user data storage

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:

```env
# MongoDB
MONGO_URL=mongodb://localhost:27017/

# Email (Gmail example)
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### 3. MongoDB Setup

Ensure MongoDB is running. The application will create the `PedolOne` database and `users` collection automatically.

### 4. Email Setup (Gmail)

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password (not your regular password)
3. Use the App Password in the `EMAIL_PASSWORD` field

### 5. Twilio Setup

1. Create a Twilio account
2. Get your Account SID and Auth Token
3. Purchase a phone number for SMS

## Running the Application

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

## API Endpoints

### Authentication Routes

All authentication routes are prefixed with `/auth`

#### 1. Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
    "email": "user@example.com",
    "phone_number": "+1234567890",
    "password": "StrongPassword123!"
}
```

**Response:**
```json
{
    "message": "User registered successfully. Please verify your email and phone number.",
    "user_id": "user_id_here"
}
```

#### 2. Verify OTP (Registration)
```http
POST /auth/verify-otp
```

**Request Body:**
```json
{
    "email": "user@example.com",
    "otp": "123456",
    "verification_type": "email"  // or "phone"
}
```

#### 3. Login
```http
POST /auth/login
```

**Request Body:**
```json
{
    "email": "user@example.com",
    "password": "StrongPassword123!"
}
```

#### 4. Verify Login OTP
```http
POST /auth/verify-login
```

**Request Body:**
```json
{
    "email": "user@example.com",
    "otp": "123456",
    "verification_method": "email"  // or "phone"
}
```

#### 5. Resend OTP
```http
POST /auth/resend-otp?email=user@example.com&otp_type=email
```

#### 6. Get User Info
```http
GET /auth/user/{user_id}
```

## Database Schema

### User Collection Structure

```json
{
    "userid": "unique_user_id",
    "email": "user@example.com",
    "mobile_number": "+1234567890",
    "password_hash": "bcrypt_hashed_password",
    "email_verified": false,
    "mobile_number_verified": false,
    "created_at": "2024-01-01T00:00:00Z",
    "email_otp": "123456",
    "phone_otp": "654321",
    "otp_created_at": "2024-01-01T00:00:00Z"
}
```

## Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character

### OTP Security
- 6-digit random OTP
- 15-minute expiration
- Separate OTPs for email and phone
- Cleared after successful verification

### Auto Cleanup
- Unverified users deleted after 15 minutes
- Background task runs every 5 minutes
- Prevents database bloat from incomplete registrations

## User Flow

### Registration Flow
1. User submits registration form
2. System validates email and phone format
3. Password is hashed using bcrypt
4. User record created with verification flags set to false
5. OTPs generated and sent via email and SMS
6. User must verify both email and phone within 15 minutes
7. Unverified records are automatically deleted after 15 minutes

### Login Flow
1. User submits email and password
2. System verifies credentials
3. Checks if user is fully verified (both email and phone)
4. Generates new OTPs for login verification
5. Sends OTPs via both email and SMS
6. User chooses either email or phone verification
7. Upon successful OTP verification, login is complete

## Error Handling

The API returns appropriate HTTP status codes:

- `200`: Success
- `400`: Bad Request (invalid data, expired OTP)
- `401`: Unauthorized (invalid credentials)
- `403`: Forbidden (unverified user)
- `404`: Not Found (user doesn't exist)
- `500`: Internal Server Error

## Development Notes

- All OTPs are logged to console for development/testing
- CORS is enabled for all origins (configure properly for production)
- Phone numbers are automatically formatted with country code
- Email validation uses pydantic's EmailStr
- Background cleanup task starts automatically with the application

## Production Considerations

1. **Environment Variables**: Use proper secrets management
2. **CORS**: Configure allowed origins properly
3. **Rate Limiting**: Implement rate limiting for OTP endpoints
4. **Monitoring**: Add logging and monitoring
5. **Database**: Use MongoDB Atlas or properly secured MongoDB instance
6. **SSL**: Use HTTPS in production
7. **Email**: Use professional email service (SendGrid, AWS SES)
8. **Phone**: Configure Twilio properly with verified numbers 