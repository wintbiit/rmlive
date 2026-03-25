<script setup lang="ts">
import { Tag } from 'primevue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Popover from 'primevue/popover';
import { computed, ref } from 'vue';
import { useUserInfoStore } from '../../stores/userInfo';
import UserProfileAvatar from './UserProfileAvatar.vue';

const userInfoStore = useUserInfoStore();
const pop = ref<InstanceType<typeof Popover> | null>(null);

const userInfo = computed(() => userInfoStore.userInfo);
const avatarLabel = computed(() => {
  const nickname = userInfo.value?.nickname ?? '';
  return nickname.charAt(0).toUpperCase();
});

function toggle(event: Event) {
  pop.value?.toggle(event);
}

function goToUserProfile() {
  if (!userInfo.value?.id) {
    return;
  }
  pop.value?.hide();
  window.open(`https://bbs.robomaster.com/user/${userInfo.value.id}`, '_blank');
}
</script>

<template>
  <div v-if="userInfo" class="user-profile-pop">
    <UserProfileAvatar @click="toggle" />

    <Popover ref="pop" :show-close-icon="false">
      <Card>
        <template #title>
          <UserProfileAvatar size="large" />
          <span>{{ userInfo.nickname }}</span>
          <Tag
            v-if="userInfo.racingAge && userInfo.role"
            :value="`${userInfo.racingAge}年${userInfo.role}`"
            severity="danger"
            size="small"
            rounded
            icon="pi pi-user"
          />
        </template>
        <template #subtitle>
          <Tag v-if="userInfo.school" :value="userInfo.school" severity="info" size="small" rounded />
          <Tag v-if="userInfo.grade" :value="userInfo.grade" severity="warn" size="small" rounded icon="pi pi-book" />
        </template>
        <template #footer>
          <Button label="访问主页" severity="primary" size="small" variant="outlined" @click="goToUserProfile" />
        </template>
      </Card>
    </Popover>
  </div>
</template>
