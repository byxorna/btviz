FROM node
MAINTAINER Gabe Conradi gabe.conradi@gmail.com
COPY . /www
WORKDIR /www
RUN npm install
EXPOSE 8080
CMD ["node_modules/.bin/http-server","-p","8080","/www"]
