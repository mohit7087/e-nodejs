# Base image
FROM node:20-alpine

# Working directory set karein
WORKDIR /usr/src/app

# package.json aur package-lock.json copy karein
COPY package*.json ./

# Dependencies install karein
RUN npm ci --only=production

# Baaki saara application code copy karein
COPY . .

# Port expose karein
EXPOSE 3000

# Application start command
CMD ["node", "server.js"]