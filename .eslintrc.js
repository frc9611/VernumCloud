module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    // Teaches eslint about defineProps/defineEmits inside <script setup>
    'vue/setup-compiler-macros': true
  },
  'extends': [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/typescript/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    // Props declared with defineProps and used only by the template read as unused
    'no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^props$' }],
    '@typescript-eslint/no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^props$' }]
  }
}
