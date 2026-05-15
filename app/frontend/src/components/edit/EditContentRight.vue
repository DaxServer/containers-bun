<script lang="ts" setup>
defineProps<{ item: Item; altPrefix: string }>()
</script>

<template>
  <!-- Right content: Image metadata -->
  <div class="flex flex-col gap-3">
    <div>Taken: {{ item.image.dates.taken.toLocaleString() }}</div>
    <div>
      Coordinates: Lat: {{ item.image.location.latitude.toFixed(6) }} Lng:
      {{ item.image.location.longitude.toFixed(6) }}
    </div>
    <div v-if="item.image.location.compass_angle">
      Compass Angle: {{ item.image.location.compass_angle.toFixed(2) }}
    </div>
    <div>Size: {{ item.image.dimensions.width }}×{{ item.image.dimensions.height }}</div>
    <ExternalLink
      :href="item.image.urls.original"
      show-icon
    >
      View image
    </ExternalLink>
    <ExternalLink
      :href="`https://www.mapillary.com/app/?pkey=${item.image.id}`"
      show-icon
    >
      View on Mapillary
    </ExternalLink>
    <Tag
      v-if="item.image.camera.is_pano"
      value="Panorama"
      severity="info"
    />
  </div>
</template>
