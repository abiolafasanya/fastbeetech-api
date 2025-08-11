export const SECRETS = {
  mail: {
    email: process.env.MAIL_USERNAME,
    password: process.env.MAIL_PASSWORD,
  },
  jwt: {
    access:
      process.env.JWT_SECRET || "qyF7oH1/UqjPUJ+2nFiO9jRnni/Pk0ovxVsX6ce+V9w=",
    refresh:
      process.env.JWT_REFRESH_SECRET ||
      "JCWWn3qQay90w1/mfFaWHEIW/e/vEs+tIWwhI8tOQmI=",
    access_duration: process.env.JWT_EXPIRES_IN || "1d",
    refresh_duration: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || "30d",
  },
  mongo_uri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fastbeetech"
};
