<template>
  <!-- 展开全屏 -->
  <music-full
    ref="MusicFullRef"
    v-model:music-full="musicFullVisible"
    :audio="audio.value as HTMLAudioElement"
    :background="background"
  />
  <!-- 底部播放栏 -->
  <div
    class="music-play-bar"
    :class="setAnimationClass('animate__bounceInUp') + ' ' + (musicFullVisible ? 'play-bar-opcity' : '')"
  >
    <n-image
      :src="getImgUrl(playMusic?.picUrl, '300y300')"
      class="play-bar-img"
      lazy
      preview-disabled
      @click="setMusicFull"
    />
    <div class="music-content">
      <div class="music-content-title">
        <n-ellipsis class="text-ellipsis" line-clamp="1">
          {{ playMusic.name }}
        </n-ellipsis>
      </div>
      <div class="music-content-name">
        <n-ellipsis class="text-ellipsis" line-clamp="1">
          <span v-for="(artists, artistsindex) in playMusic.ar || playMusic.song.artists" :key="artistsindex"
            >{{ artists.name
            }}{{ artistsindex < (playMusic.ar || playMusic.song.artists).length - 1 ? ' / ' : '' }}</span
          >
        </n-ellipsis>
      </div>
    </div>
    <div class="music-buttons">
      <div class="music-buttons-prev" @click="handlePrev">
        <i class="iconfont icon-prev"></i>
      </div>
      <div class="music-buttons-play" @click="playMusicEvent">
        <i class="iconfont icon" :class="play ? 'icon-stop' : 'icon-play'"></i>
      </div>
      <div class="music-buttons-next" @click="handleEnded">
        <i class="iconfont icon-next"></i>
      </div>
    </div>
    <div class="music-time custom-slider">
      <div class="time">{{ getNowTime }}</div>
      <n-slider v-model:value="timeSlider" :step="0.05" :tooltip="false"></n-slider>
      <div class="time">{{ getAllTime }}</div>
    </div>
    <div class="audio-volume custom-slider">
      <div>
        <i class="iconfont icon-notificationfill"></i>
      </div>
      <n-slider v-model:value="volumeSlider" :step="0.01" :tooltip="false"></n-slider>
    </div>
    <div class="audio-button">
      <!-- <n-tooltip trigger="hover" :z-index="9999999">
        <template #trigger>
          <i class="iconfont icon-likefill"></i>
        </template>
        喜欢
      </n-tooltip> -->
      <!-- <n-tooltip trigger="hover" :z-index="9999999">
        <template #trigger>
          <i class="iconfont icon-Play" @click="parsingMusic"></i>
        </template>
        解析播放
      </n-tooltip> -->
      <n-tooltip v-if="isElectron" class="music-lyric" trigger="hover" :z-index="9999999">
        <template #trigger>
          <i class="iconfont ri-netease-cloud-music-line" @click="openLyric"></i>
        </template>
        歌词
      </n-tooltip>
      <n-popover
        trigger="click"
        :z-index="99999999"
        content-class="music-play"
        raw
        :show-arrow="false"
        :delay="200"
        arrow-wrapper-style=" border-radius:1.5rem"
        @update-show="scrollToPlayList"
      >
        <template #trigger>
          <n-tooltip trigger="manual" :z-index="9999999">
            <template #trigger>
              <i class="iconfont icon-list"></i>
            </template>
            播放列表
          </n-tooltip>
        </template>
        <div class="music-play-list">
          <div class="music-play-list-back"></div>
          <n-virtual-list ref="palyListRef" :item-size="62" item-resizable :items="playList">
            <template #default="{ item }">
              <div class="music-play-list-content">
                <song-item :key="item.id" :item="item" mini></song-item>
              </div>
            </template>
          </n-virtual-list>
        </div>
      </n-popover>
    </div>
    <!-- 播放音乐 -->
  </div>
</template>

<script lang="ts" setup>
import { useTemplateRef } from 'vue';
import { useStore } from 'vuex';

import SongItem from '@/components/common/SongItem.vue';
import { allTime, getCurrentLrc, isElectron, nowTime, openLyric, sendLyricToWin } from '@/hooks/MusicHook';
import type { SongResult } from '@/type/music';
import { getImgUrl, secondToMinute, setAnimationClass } from '@/utils';

import MusicFull from './MusicFull.vue';

const store = useStore();

// 播放的音乐信息
const playMusic = computed(() => store.state.playMusic as SongResult);
// 是否播放
const play = computed(() => store.state.play as boolean);

const playList = computed(() => store.state.playList as SongResult[]);

const audio = {
  value: document.querySelector('#MusicAudio') as HTMLAudioElement,
};
const background = ref('#000');

watch(
  () => store.state.playMusic,
  async () => {
    background.value = playMusic.value.backgroundColor as string;
  },
  { immediate: true, deep: true },
);

const audioPlay = () => {
  if (audio.value) {
    audio.value.play();
  }
};

// 计算属性  获取当前播放时间的进度
const timeSlider = computed({
  get: () => (nowTime.value / allTime.value) * 100,
  set: (value) => {
    if (!audio.value) return;
    audio.value.currentTime = (value * allTime.value) / 100;
    audioPlay();
    store.commit('setPlayMusic', true);
  },
});

// 音量条
const audioVolume = ref(1);
const volumeSlider = computed({
  get: () => audioVolume.value * 100,
  set: (value) => {
    if (!audio.value) return;
    audio.value.volume = value / 100;
  },
});
// 获取当前播放时间
const getNowTime = computed(() => {
  return secondToMinute(nowTime.value);
});

// 获取总时间
const getAllTime = computed(() => {
  return secondToMinute(allTime.value);
});

// 监听音乐播放 获取时间
const onAudio = () => {
  if (audio.value) {
    audio.value.removeEventListener('timeupdate', handleGetAudioTime);
    audio.value.removeEventListener('ended', handleEnded);
    audio.value.addEventListener('timeupdate', handleGetAudioTime);
    audio.value.addEventListener('ended', handleEnded);
    // 监听音乐播放暂停
    audio.value.addEventListener('pause', () => {
      store.commit('setPlayMusic', false);
    });
    audio.value.addEventListener('play', () => {
      store.commit('setPlayMusic', true);
    });
  }
};

onAudio();

function handleEnded() {
  store.commit('nextPlay');
}

function handlePrev() {
  store.commit('prevPlay');
}

const MusicFullRef = ref<any>(null);

function handleGetAudioTime(this: HTMLAudioElement) {
  // 监听音频播放的实时时间事件
  const audio = this as HTMLAudioElement;
  // 获取当前播放时间
  nowTime.value = audio.currentTime;
  getCurrentLrc();
  // 获取总时间
  allTime.value = audio.duration;
  // 获取音量
  audioVolume.value = audio.volume;
  sendLyricToWin(store.state.isPlay);
  // if (musicFullVisible.value) {
  //   MusicFullRef.value?.lrcScroll();
  // }
}

// 播放暂停按钮事件
const playMusicEvent = async () => {
  if (play.value) {
    store.commit('setPlayMusic', false);
  } else {
    store.commit('setPlayMusic', true);
  }
};

const musicFullVisible = ref(false);

// 设置musicFull
const setMusicFull = () => {
  musicFullVisible.value = !musicFullVisible.value;
};

const palyListRef = useTemplateRef('palyListRef');

const scrollToPlayList = (val: boolean) => {
  if (!val) return;
  setTimeout(() => {
    palyListRef.value?.scrollTo({ top: store.state.playListIndex * 62 });
  }, 50);
};
</script>

<style lang="scss" scoped>
.text-ellipsis {
  width: 100%;
}

.music-play-bar {
  @apply h-20 w-full absolute bottom-0 left-0 flex items-center rounded-t-2xl overflow-hidden box-border px-6 py-2;
  z-index: 9999;
  box-shadow: 0px 0px 10px 2px rgba(203, 203, 203, 0.034);
  background-color: #212121;
  animation-duration: 0.5s !important;
  .music-content {
    width: 140px;
    @apply ml-4;

    &-title {
      @apply text-base text-white;
    }

    &-name {
      @apply text-xs mt-1 text-gray-100;
    }
  }
}

.play-bar-opcity {
  @apply bg-transparent;
  box-shadow: 0 0 20px 5px #0000001d;
}

.play-bar-img {
  @apply w-14 h-14 rounded-2xl;
}

.music-buttons {
  @apply mx-6;

  .iconfont {
    @apply text-2xl hover:text-green-500 transition;
  }

  .icon {
    @apply text-xl hover:text-white;
  }

  @apply flex items-center;

  > div {
    @apply cursor-pointer;
  }

  &-play {
    background: #383838;
    @apply flex justify-center items-center w-12 h-12 rounded-full mx-4 hover:bg-green-500 transition bg-opacity-40;
  }
}

.music-time {
  @apply flex flex-1 items-center;

  .time {
    @apply mx-4 mt-1;
  }
}

.audio-volume {
  width: 140px;
  @apply flex items-center mx-4;

  .iconfont {
    @apply text-2xl hover:text-green-500 transition cursor-pointer mr-4;
  }
}

.audio-button {
  @apply flex items-center mx-4;

  .iconfont {
    @apply text-2xl hover:text-green-500 transition cursor-pointer m-4;
  }
}

.music-play {
  &-list {
    height: 50vh;
    width: 300px;
    @apply relative rounded-3xl overflow-hidden py-2;
    &-back {
      backdrop-filter: blur(20px);
      @apply absolute top-0 left-0 w-full h-full bg-gray-800 bg-opacity-75;
    }
    &-content {
      @apply mx-2;
    }
  }
}

.mobile {
  .music-play-bar {
    @apply px-4;
    bottom: 70px;
  }
  .music-time {
    display: none;
  }
  .ri-netease-cloud-music-line {
    display: none;
  }
  .audio-volume {
    display: none;
  }
  .audio-button {
    @apply mx-0;
  }
  .music-buttons {
    @apply m-0;
    &-prev,
    &-next {
      display: none;
    }
    &-play {
      @apply m-0;
    }
  }
  .music-content {
    flex: 1;
  }
}

// 添加自定义 slider 样式
.custom-slider {
  :deep(.n-slider) {
    --n-rail-height: 4px;
    --n-rail-color: rgba(255, 255, 255, 0.2);
    --n-fill-color: var(--primary-color);
    --n-handle-size: 12px;
    --n-handle-color: var(--primary-color);

    &:hover {
      --n-rail-height: 6px;
      --n-handle-size: 14px;
    }

    .n-slider-rail {
      @apply overflow-hidden;
    }

    .n-slider-handle {
      @apply transition-opacity duration-200;
      opacity: 0;
    }

    &:hover .n-slider-handle {
      opacity: 1;
    }
  }
}

:root {
  --primary-color: #18a058;
}
</style>
