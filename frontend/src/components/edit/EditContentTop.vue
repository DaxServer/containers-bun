<script lang="ts" setup>
const props = defineProps<{ item: Item; altPrefix: string }>()

const store = useCollectionsStore()
const { getEffectiveTitle, verifyTitles } = useCommons()

const effectiveTitle = computed(() => getEffectiveTitle(props.item))

const isTitleFocused = ref(false)
const titleDraft = ref('')

const displayedTitle = computed(() => {
  if (isTitleFocused.value) return titleDraft.value
  return effectiveTitle.value
})

const onTitleChange = (title?: string) => {
  store.updateItem(props.item.id, 'title', title || '')
  if (!title) {
    store.updateItem(props.item.id, 'titleStatus', TITLE_STATUS.Invalid)
  } else {
    verifyTitles([{ id: props.item.id, title, image: props.item.image }], { debounce: true })
  }
}

const onTitleInput = (title?: string) => {
  titleDraft.value = title ?? ''
  onTitleChange(title)
}

const onTitleFocus = () => {
  isTitleFocused.value = true
  titleDraft.value = effectiveTitle.value
}

const onTitleBlur = () => {
  isTitleFocused.value = false

  if (titleDraft.value.trim()) return

  const titleToVerify = effectiveTitle.value.trim()
  if (!titleToVerify) return

  verifyTitles([{ id: props.item.id, title: titleToVerify, image: props.item.image }], {
    debounce: true,
  })
}
</script>

<template>
  <div class="flex items-start gap-4">
    <span class="text-4xl font-medium">{{ item.index }}</span>
    <div class="flex-1 flex flex-col gap-1">
      <IconField>
        <InputText
          :modelValue="displayedTitle"
          :invalid="item.meta.titleStatus && TITLE_ERROR_STATUSES.includes(item.meta.titleStatus)"
          @update:modelValue="onTitleInput($event)"
          @focus="onTitleFocus"
          @blur="onTitleBlur"
          fluid
        />
        <InputIcon
          class="pi"
          :class="{
            'text-inherit! pi-spin pi-spinner': item.meta.titleStatus === TITLE_STATUS.Checking,
            'text-green-600! pi-check-circle': item.meta.titleStatus === TITLE_STATUS.Available,
            'text-red-500! pi-times-circle':
              item.meta.titleStatus && TITLE_ERROR_STATUSES.includes(item.meta.titleStatus),
            'text-yellow-500! pi-exclamation-triangle':
              item.meta.titleStatus === TITLE_STATUS.Unknown,
          }"
        />
      </IconField>

      <!-- Status Messages -->
      <SimpleMessage
        v-if="item.meta.titleStatus === TITLE_STATUS.Checking"
        severity="info"
        variant="simple"
        size="small"
        icon="pi pi-spinner pi-spin"
        class="pl-3"
      >
        Checking title availability...
      </SimpleMessage>
      <SimpleMessage
        v-else-if="item.meta.titleStatus === TITLE_STATUS.Taken"
        severity="error"
        variant="simple"
        size="small"
        icon="pi pi-times-circle"
        class="pl-3"
      >
        Title is not possible.
        <ExternalLink
          :href="`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(effectiveTitle)}`"
          class="text-primary"
        >
          Check existing file
        </ExternalLink>
      </SimpleMessage>
      <SimpleMessage
        v-else-if="item.meta.titleStatus === TITLE_STATUS.Invalid"
        severity="error"
        variant="simple"
        size="small"
        icon="pi pi-times-circle"
        class="pl-3"
      >
        Extension is not valid. Valid extensions are: {{ VALID_EXTENSIONS.join(', ') }}
      </SimpleMessage>
      <SimpleMessage
        v-else-if="item.meta.titleStatus === TITLE_STATUS.Blacklisted"
        severity="error"
        variant="simple"
        size="small"
        icon="pi pi-times-circle"
        class="pl-3"
      >
        Title is blacklisted and cannot be used
      </SimpleMessage>
      <SimpleMessage
        v-else-if="item.meta.titleStatus === TITLE_STATUS.Duplicate"
        severity="error"
        variant="simple"
        size="small"
        icon="pi pi-times-circle"
        class="pl-3"
      >
        Title is duplicated within this collection. Each item must have a unique title.
      </SimpleMessage>
      <SimpleMessage
        v-else-if="item.meta.titleStatus === TITLE_STATUS.Unknown"
        severity="warn"
        variant="simple"
        size="small"
        icon="pi pi-exclamation-triangle"
        class="pl-3"
      >
        Unable to verify title availability
      </SimpleMessage>
      <SimpleMessage
        v-else-if="item.meta.titleStatus === TITLE_STATUS.MissingFields"
        severity="error"
        variant="simple"
        size="small"
        icon="pi pi-exclamation-triangle"
        class="pl-3"
      >
        {{
          item.meta.missingFields?.length
            ? `Missing template fields: ${item.meta.missingFields.map((p) => FIELD_PATH_TO_NAME[p] ?? p).join(', ')}`
            : 'Missing fields required by the title template'
        }}
      </SimpleMessage>
      <SimpleMessage
        v-else-if="item.meta.titleStatus === TITLE_STATUS.Available"
        severity="success"
        variant="simple"
        size="small"
        icon="pi pi-check-circle"
        class="pl-3"
      >
        Title is available
      </SimpleMessage>

      <div
        v-if="item.image.existing.length"
        class="mt-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded"
      >
        <strong>Existing files found on server:</strong>
        <div
          v-for="page in item.image.existing"
          :key="page.url"
        >
          <ExternalLink
            :href="page.url"
            class="hover:underline"
            show-icon
          >
            {{ page.url }}
          </ExternalLink>
        </div>
      </div>
    </div>
  </div>
</template>
