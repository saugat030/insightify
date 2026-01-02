#Use Node 20 (Alpine is the lightweight Linux version)
FROM node:20-alpine

#Set the working directory
WORKDIR /app

#Copy package files first (so we don't reinstall npm packages if only code changes)
COPY package*.json ./

#Clean install of dependencies
RUN npm ci

#Copy the rest of your source code
COPY . .

#Build the Next.js app
RUN npm run build

#Expose the port (Next.js defaults to 3000)
EXPOSE 3000

#Start the app
CMD ["npm", "start"]