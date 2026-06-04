import { copyFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";

const fonts = [
  ["node_modules/@expo-google-fonts/source-serif-4/400Regular/SourceSerif4_400Regular.ttf", "public/fonts/source-serif-4-regular.ttf"],
  ["node_modules/@expo-google-fonts/source-serif-4/700Bold/SourceSerif4_700Bold.ttf", "public/fonts/source-serif-4-bold.ttf"],
  ["node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf", "public/fonts/inter-regular.ttf"],
  ["node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf", "public/fonts/inter-bold.ttf"],
  ["node_modules/@expo-google-fonts/roboto-mono/400Regular/RobotoMono_400Regular.ttf", "public/fonts/roboto-mono-regular.ttf"],
  ["node_modules/@expo-google-fonts/roboto-mono/700Bold/RobotoMono_700Bold.ttf", "public/fonts/roboto-mono-bold.ttf"]
];

mkdirSync("public/fonts", { recursive: true });

for (const staleFont of ["public/fonts/ibm-plex-mono-regular.ttf", "public/fonts/ibm-plex-mono-bold.ttf"]) {
  if (existsSync(staleFont)) unlinkSync(staleFont);
}

for (const [source, target] of fonts) {
  copyFileSync(source, target);
}

console.log(`Copied ${fonts.length} PDF font files.`);
