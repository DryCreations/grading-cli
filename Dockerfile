FROM ubuntu

RUN apt-get update \
&& apt-get -y install sudo \
&& apt-get -y install apt-utils  \
&& apt-get -y install curl \
&& apt-get -y install unzip \
&& apt-get -y install git

RUN curl -fsSL https://deno.land/x/install/install.sh | sh

ENV DENO_INSTALL="root/.deno"
ENV PATH="$DENO_INSTALL/bin:$PATH"

ADD . /src/
