FROM node
MAINTAINER Gabe Conradi gabe.conradi@gmail.com
COPY . /www
WORKDIR /www
RUN npm install -g http-server
EXPOSE 8080
CMD ["http-server","-p","8080","/www"]
