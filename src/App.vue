<template>
  <ul>
    <li><Router-link :to="{name:'login'}">Login</Router-link></li>
    <li><Router-link :to="{name:'home'}">Home</Router-link></li>
    <li><Router-link :to="{name:'about'}">Sobre o Vernum Cloud</Router-link></li>
  </ul>
<router-view/>
</template>
<script setup>

</script>
<style lang="scss" scoped>

</style>