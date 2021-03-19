# docker run -v ${PWD}:/home/owt -it ubuntu:18.04 sh /home/owt/cloudinit-deps.sh
cd /opt

DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y -q --no-install-recommends build-essential autoconf make git wget pciutils cpio libtool lsb-release ca-certificates pkg-config bison flex libcurl4-gnutls-dev zlib1g-dev nasm yasm m4 autoconf libtool automake cmake libfreetype6-dev libgstreamer-plugins-base1.0-dev

# Build OWT specific modules
OWTSERVER_REPO=https://github.com/open-webrtc-toolkit/owt-server.git
OPENH264_MAJOR=1
OPENH264_MINOR=7
OPENH264_SOVER=4
OPENH264_SOURCENAME=v${OPENH264_MAJOR}.${OPENH264_MINOR}.0.tar.gz
OPENH264_SOURCE=https://github.com/cisco/openh264/archive/v${OPENH264_MAJOR}.${OPENH264_MINOR}.0.tar.gz
OPENH264_BINARYNAME=libopenh264-${OPENH264_MAJOR}.${OPENH264_MINOR}.0-linux64.${OPENH264_SOVER}.so
OPENH264_BINARY=https://github.com/cisco/openh264/releases/download/v${OPENH264_MAJOR}.${OPENH264_MINOR}.0/${OPENH264_BINARYNAME}.bz2
LICODE_COMMIT="8b4692c88f1fc24dedad66b4f40b1f3d804b50ca"
LICODE_REPO=https://github.com/lynckia/licode.git
WEBRTC_REPO=https://github.com/open-webrtc-toolkit/owt-deps-webrtc.git
SVT_VER=v1.3.0
SVT_REPO=https://github.com/intel/SVT-HEVC.git
SERVER_PATH=/opt/owt-server
DIST_PATH=/opt/owt
OWT_SDK_REPO=https://github.com/open-webrtc-toolkit/owt-client-javascript.git
OWT_BRANCH=master
IMG_APP_PATH=/app_data/
APP_PATH=${IMG_APP_PATH}

# 1. Clone OWT server source code 
# 2. Clone licode source code and patch
# 3. Clone webrtc source code and patch
git config --global user.email "you@example.com" && \
git config --global user.name "Your Name" && \
git clone --depth=1 -b ${OWT_BRANCH} ${OWTSERVER_REPO} && \

cd ${SERVER_PATH}

# Install deps from bash for owt
./scripts/installDepsUnattended.sh --with-nonfree-libs

# Install node modules for owt
npm install -g --loglevel error node-gyp@6.1.0 grunt-cli underscore jsdoc && \
cd ${SERVER_PATH} && npm install nan && \

# Get js client sdk for owt
cd /opt && git clone --depth=1 -b ${OWT_BRANCH} ${OWT_SDK_REPO} && cd owt-client-javascript/scripts && npm install && grunt  && \
mkdir ${SERVER_PATH}/third_party/quic-lib && \
export LD_LIBRARY_PATH=/usr/local/lib/x86_64-linux-gnu && \
cd ${SERVER_PATH}/third_party/quic-lib && wget https://github.com/open-webrtc-toolkit/owt-deps-quic/releases/download/v0.1/dist.tgz && tar xzf dist.tgz && \
#Build and pack owt
sed -i "/lssl/i\'\-L\/usr\/local\/ssl\/lib\'," /opt/owt-server/source/agent/webrtc/rtcConn/binding.gyp && \
sed -i "/lssl/i\'\-L\/usr\/local\/ssl\/lib\'," /opt/owt-server/source/agent/webrtc/rtcFrame/binding.gyp && \
cd ${SERVER_PATH} && export PKG_CONFIG_PATH=/usr/local/lib/x86_64-linux-gnu/pkgconfig && ./scripts/build.js -t mcu-all -r -c && \
./scripts/pack.js -t all --install-module --no-pseudo --app-path /opt/owt-client-javascript/dist/samples/conference

mv ${SERVER_PATH}/dist ${DIST_PATH}

${DIST_PATH}/bin/init-all.sh && \
${DIST_PATH}/video_agent/install_openh264.sh && \
${DIST_PATH}/audio_agent/compile_ffmpeg_with_libfdkaac.sh && \
cp -r ${DIST_PATH}/audio_agent/ffmpeg_libfdkaac_lib ${DIST_PATH}/audio_agent/lib && \
${DIST_PATH}/video_agent/compile_svtHevcEncoder.sh && \
cp -r ${DIST_PATH}/video_agent/libSvtHevcEnc.so.1 ${DIST_PATH}/video_agent/lib

# cd /opt
# openssl genrsa -out owt-key.pem 2048
# openssl req -new -sha256 -key owt-key.pem -out owt-csr.pem
# openssl x509 -req -in owt-csr.pem -signkey owt-key.pem -out owt-cert.pem
# openssl pkcs12 -export -in owt-cert.pem -inkey owt-key.pem \
#       -certfile ca-cert.pem -out owt.pfx

#Update portal to server public IP
