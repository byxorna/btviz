FROM node
MAINTAINER Gabe Conradi gabe.conradi@gmail.com
RUN npm install -g http-server
VOLUME /www
CMD ["http-server","/www"]
