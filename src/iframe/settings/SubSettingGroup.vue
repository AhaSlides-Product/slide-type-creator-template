<script setup lang="ts">
// SubSettingGroup — wraps settings that only apply when their parent toggle is on.
//
// INDENT ONLY (mt-4 pl-4), no left rail. The indent alone signals "these depend on
// the row above". Its parent MUST be a bold SectionHeader carrying the master
// toggle — an indented group under a normal-weight row reads as detached.
//
// The caller keeps it hidden until the parent is on:
//   <SectionHeader label="Time limit"><template #action><Switch …/></template></SectionHeader>
//   <SubSettingGroup v-if="config.timed"> …dependent controls… </SubSettingGroup>
//
// NOTE: this is intentionally distinct from the older SETTINGS_SUB_WRAPPER_CLASS
// (which still carries a left border) so existing panels are untouched; new panels
// built from this library use the border-free indent the design settled on.
</script>

<template>
  <div class="aha-subgroup">
    <slot />
  </div>
</template>

<style scoped>
.aha-subgroup {
  margin-top: 16px; /* mt-4 */
  padding-left: 16px; /* pl-4 — indent only, NO left border */
}
</style>
