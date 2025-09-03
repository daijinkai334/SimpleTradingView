<template>
  <div id="app-container">
    <TradingChart />
  </div>
</template>

<script>
import TradingChart from "./components/TradingChart.vue";

export default {
  name: "App",
  components: {
    TradingChart,
  },
};
</script>

<style>
/* Reset some default browser styles */
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  width: 100%;
  height: 100%;
}

#app-container {
  width: 100%;
  height: 100vh; /* Full viewport height */
}
</style>
