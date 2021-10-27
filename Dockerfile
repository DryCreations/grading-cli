FROM ubuntu:latest

WORKDIR /grading

ENV TZ=America/New_York
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN apt-get update \
&& apt-get -y install sudo \
&& apt-get -y install apt-utils  \
&& apt-get -y install curl \
&& apt-get -y install unzip \
&& apt-get -y install git \
&& apt-get -y install default-jdk

RUN curl -fsSL https://deno.land/x/install/install.sh | sh

ENV DENO_INSTALL="/root/.deno"
ENV PATH="$DENO_INSTALL/bin:$PATH"

COPY ./mod.js ./mod.js
COPY ./modules ./modules
COPY ./.env ./.env

RUN deno cache --unstable --no-check mod.js

COPY ./data ./data