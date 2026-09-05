# SimpleChat
A lightweight, real-time messaging app built with Node.js and WebSockets. Designed to be fast, private, and easy to deploy.  

## **Features:** ##

**Real-Time Bidirectional Messaging:** Instant 1-on-1 private chat utilizing persistent WebSocket connections via Socket.io.  
**Zero-Persistence Media Privacy:** Images are transmitted in-memory as Base64 streams without being permanently logged to the server filesystem or database.  
**Live User Presence:** Dynamic online/offline indicator dots reflecting active socket sessions in real time.  
**Typing Indicators:** Responsive live typing states with debounced automated timeouts.  
**Message History & Management:** Persistent text conversation logs powered by MongoDB Atlas, with features for individual message deletion and full chat wiping.  
**Authentication & Security:** User registration and sign-in secured via Bcrypt password salting and stateless JSON Web Tokens (JWT).  
**Keep-Alive Daemon:** Integrated background HTTPS pinging interval to prevent cloud instance hibernation on free-tier deployments.  

## **Tech Stack:** ##

**Backend:** Node.js, Express.js  
**Engine:** Socket.io  
**Database & ODM:** MongoDB Atlas, Mongoose  
**Authentication:** Bcrypt.js, JSON Web Tokens  
**Frontend:** Semantic HTML5, CSS3, JavaScript  
**Deployment:** Render PaaS  

## **Installation:** ##  

```git clone https://github.com/KartikeyaRaghav/SimpleChat.git  
cd SimpleChat  
npm install  

Add the following to .env:  
PORT=3000  
MONGO_URI=mongodb_connection_string  
JWT_SECRET=jwt_secret_key  

Start:  
node index.js  
```
Open http://localhost:3000 in browser.  

## **License** ##  
MIT  
