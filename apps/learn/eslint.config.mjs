import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// lib/content/course.ts imports every quiz and exam bank (answer keys included). A runtime import of it
// from a "use client" file ships all of that in a public /_next/static chunk, so client files may only
// `import type` from it; pick3 / optionText live in lib/content/text.ts. scripts/check-client-bundle.mjs
// catches the transitive cases this rule cannot see.
const COURSE = /(?:^@\/lib\/content|\/content|^\.)\/course(?:\.ts)?$/;
const noClientCourseImport = {
  meta: { type: "problem", messages: { leak: "A \"use client\" file may only `import type` from lib/content/course (it bundles the answer keys). Import pick3 / optionText from @/lib/content/text." } },
  create(context) {
    const isClient = context.sourceCode.ast.body.some((n) => n.type === "ExpressionStatement" && n.directive === "use client");
    if (!isClient) return {};
    const check = (node) => { if (node.source && COURSE.test(node.source.value) && node.importKind !== "type" && node.exportKind !== "type") context.report({ node, messageId: "leak" }); };
    return { ImportDeclaration: check, ExportNamedDeclaration: check, ExportAllDeclaration: check };
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { local: { rules: { "no-client-course-import": noClientCourseImport } } },
    rules: { "local/no-client-course-import": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
