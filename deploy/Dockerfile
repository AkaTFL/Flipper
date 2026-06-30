FROM nginx:1.27-alpine

COPY frontend/flipper /usr/share/nginx/html/flipper
COPY frontend/backglass /usr/share/nginx/html/backglass
COPY frontend/dmd /usr/share/nginx/html/dmd
COPY deploy/router.html /usr/share/nginx/html/index.html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
