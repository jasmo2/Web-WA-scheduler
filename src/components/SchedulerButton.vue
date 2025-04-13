<template>
  <button class="scheduler-button" @click="handleClick" title="Schedule a message">
    <img :src="iconSrc" alt="Schedule" />
  </button>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    iconSrc: {
      type: String,
      required: true,
    },
  },
  methods: {
    handleClick() {
      console.log("Scheduler button clicked!");
      alert("Scheduler button clicked!");
    },
  },
});
</script>

<style scoped>
.scheduler-button {
  background: none;
  border: none;
  cursor: pointer;
  width: 24px;
  height: 24px;
  padding: 0;
}
.scheduler-button img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>