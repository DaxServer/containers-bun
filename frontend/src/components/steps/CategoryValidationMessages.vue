<script setup lang="ts">
withDefaults(defineProps<{ missingCategories: string[]; showAutoAdded?: boolean }>(), {
  showAutoAdded: false,
})
</script>

<template>
  <SimpleMessage
    v-if="showAutoAdded"
    severity="secondary"
    variant="simple"
    size="small"
    class="-mt-3 pl-3"
  >
    <ExternalLink
      href="https://commons.wikimedia.org/wiki/Category:Images_from_Mapillary_uploaded_with_Curator"
      class="hover:text-primary"
    >
      [[Category:Images from Mapillary uploaded with Curator]]
    </ExternalLink>
    will be added
  </SimpleMessage>
  <SimpleMessage
    v-if="missingCategories.length > 0"
    severity="warn"
    size="small"
    class="-mt-2 pl-3"
  >
    These categories don't exist yet — click to create:
    <ul class="mt-1 pl-4 list-disc">
      <li
        v-for="name in missingCategories"
        :key="name"
      >
        <ExternalLink
          :href="`https://commons.wikimedia.org/w/index.php?title=Category:${encodeURIComponent(name)}&action=edit`"
          class="hover:text-primary"
        >
          Category:{{ name }}
        </ExternalLink>
      </li>
    </ul>
  </SimpleMessage>
</template>
