import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.duetapp.app",
  appName: "DuetApp",
  webDir: "out",
  server: {
    url: "https://mreact.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#0D0D14",
  },
  android: {
    backgroundColor: "#0D0D14",
  },
};

export default config;
