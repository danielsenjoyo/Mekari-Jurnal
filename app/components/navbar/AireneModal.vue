<template>
  <Teleport to="body">
    <Transition name="airene-overlay">
      <Pixel.div v-if="open" :class="overlayClass" @click.self="emit('close')">
        <Transition name="airene-modal" appear>
          <Pixel.div data-slot="aireneModal" :class="modalClass">
            <!-- Sidebar -->
            <Pixel.aside
              :class="[sidebarBaseClass, collapsed ? sidebarCollapsedClass : sidebarExpandedClass]"
            >
              <!-- Header: logo + collapse/expand toggle -->
              <Pixel.div
                :class="
                  css({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    gap: '2',
                    paddingX: collapsed ? '0' : '4',
                    paddingY: '4'
                  })
                "
              >
                <Pixel.div
                  v-if="!collapsed"
                  :class="css({ display: 'flex', alignItems: 'center', gap: '2' })"
                >
                  <MpIcon name="airene-brand" size="md" />
                  <Pixel.div
                    :class="css({ display: 'flex', flexDirection: 'column', lineHeight: 'none' })"
                  >
                    <MpText size="overline" color="gray.500">mekari</MpText>
                    <MpText size="body" color="gray.900" :class="css({ fontWeight: 'bold' })"
                      >airene</MpText
                    >
                  </Pixel.div>
                </Pixel.div>

                <MpButton
                  variant="ghost"
                  size="sm"
                  :left-icon="collapsed ? 'sidebar-show' : 'sidebar-hide'"
                  :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
                  @click="collapsed = !collapsed"
                />
              </Pixel.div>

              <!-- New chat -->
              <Pixel.div
                :class="
                  css({
                    paddingX: collapsed ? '0' : '3',
                    display: 'flex',
                    justifyContent: 'center'
                  })
                "
              >
                <Pixel.button
                  :class="collapsed ? newChatCollapsedClass : newChatClass"
                  aria-label="New chat"
                  @click="resetChat"
                >
                  <MpIcon name="chat" size="sm" color="gray.700" />
                  <MpText
                    v-if="!collapsed"
                    size="body"
                    color="gray.700"
                    :class="css({ fontWeight: 'medium' })"
                    >New chat</MpText
                  >
                </Pixel.button>
              </Pixel.div>

              <!-- Footer -->
              <Pixel.div
                :class="
                  css({
                    marginTop: 'auto',
                    paddingX: collapsed ? '0' : '4',
                    paddingY: '4',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: collapsed ? 'center' : 'stretch',
                    gap: '4'
                  })
                "
              >
                <Pixel.button :class="sidebarLinkClass" aria-label="Ask credits">
                  <MpIcon name="wallet" size="sm" color="gray.700" />
                  <MpText v-if="!collapsed" size="body" color="gray.700">Ask credits</MpText>
                </Pixel.button>
                <Pixel.button :class="sidebarLinkClass" aria-label="Help">
                  <MpIcon name="help" size="sm" color="gray.700" />
                  <MpText v-if="!collapsed" size="body" color="gray.700">Help</MpText>
                </Pixel.button>
              </Pixel.div>
            </Pixel.aside>

            <!-- Main -->
            <Pixel.div :class="mainClass">
              <Pixel.div
                :class="
                  css({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    flexShrink: '0',
                    height: 'var(--layout-header-height)',
                    paddingX: '4',
                    borderBottomWidth: 'sm',
                    borderColor: 'gray.100'
                  })
                "
              >
                <MpButton
                  variant="ghost"
                  size="sm"
                  left-icon="close"
                  aria-label="Close"
                  @click="emit('close')"
                />
              </Pixel.div>

              <!-- Body: scrollable thread / empty state above a pinned input -->
              <Pixel.div :class="bodyClass">
                <Pixel.div :class="scrollWrapperClass">
                  <Pixel.div ref="threadNode" :class="scrollClass" @scroll="onThreadScroll">
                    <Pixel.div
                      :class="
                        css({
                          width: 'full',
                          maxWidth: '600px',
                          marginX: 'auto',
                          marginTop: 'auto'
                        })
                      "
                    >
                      <!-- Empty state -->
                      <template v-if="messages.length === 0">
                        <MpIcon name="airene-brand" size="2.5rem" />

                        <MpText
                          size="body"
                          color="gray.900"
                          :class="css({ display: 'block', marginTop: '5' })"
                        >
                          Hello, {{ accountInformation.fullName }}
                        </MpText>

                        <MpText
                          size="body"
                          color="gray.700"
                          :class="css({ display: 'block', marginTop: '3' })"
                        >
                          I am Airene, an AI assistant that will help you find answers on reports,
                          sales, purchases, products, stocks, and tutorials about Jurnal features.
                        </MpText>

                        <MpText
                          size="overline"
                          color="gray.500"
                          :class="
                            css({
                              display: 'block',
                              marginTop: '6',
                              marginBottom: '3',
                              textTransform: 'uppercase'
                            })
                          "
                        >
                          Question examples
                        </MpText>

                        <Pixel.div
                          :class="
                            css({
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: '3'
                            })
                          "
                        >
                          <Pixel.button
                            v-for="q in questions"
                            :key="q"
                            :class="questionPillClass"
                            @click="send(q)"
                          >
                            <MpText size="body" color="blue.400">{{ q }}</MpText>
                          </Pixel.button>
                        </Pixel.div>
                      </template>

                      <!-- Conversation -->
                      <template v-else>
                        <MpText
                          size="label"
                          color="gray.500"
                          :class="
                            css({
                              display: 'block',
                              textAlign: 'center',
                              marginTop: '6',
                              marginBottom: '6',
                              fontSize: 'sm'
                            })
                          "
                        >
                          {{ dateLabel }}
                        </MpText>

                        <Pixel.div
                          :class="css({ display: 'flex', flexDirection: 'column', gap: '6' })"
                        >
                          <template v-for="msg in messages" :key="msg.id">
                            <!-- User message (right) -->
                            <Pixel.div v-if="msg.role === 'user'">
                              <Pixel.div
                                :class="
                                  css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    gap: '2',
                                    marginBottom: '2'
                                  })
                                "
                              >
                                <MpText
                                  size="body"
                                  color="gray.900"
                                  :class="css({ fontWeight: 'semiBold' })"
                                  >You</MpText
                                >
                                <MpIcon name="profile" size="md" color="gray.700" />
                              </Pixel.div>
                              <MpText
                                size="body"
                                color="gray.900"
                                :class="css({ display: 'block', textAlign: 'right' })"
                                >{{ msg.text }}</MpText
                              >
                            </Pixel.div>

                            <!-- Airene message (left) -->
                            <Pixel.div v-else>
                              <Pixel.div
                                :class="
                                  css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2',
                                    marginBottom: '2'
                                  })
                                "
                              >
                                <MpIcon name="airene-brand" size="md" />
                                <MpText
                                  size="body"
                                  color="gray.900"
                                  :class="css({ fontWeight: 'semiBold' })"
                                  >Airene</MpText
                                >
                              </Pixel.div>

                              <Transition name="airene-reveal" appear>
                                <!-- Answer -->
                                <Pixel.div key="answer">
                                  <!-- Reasoning (plain, collapsible) -->
                                  <Pixel.div :class="css({ marginBottom: '3' })">
                                    <Pixel.button
                                      :class="reasoningToggleClass"
                                      :aria-expanded="msg.showReasoning"
                                      @click="msg.showReasoning = !msg.showReasoning"
                                    >
                                      <MpText
                                        size="label"
                                        color="text.secondary"
                                        :class="css({ fontSize: 'sm' })"
                                        >Reasoning</MpText
                                      >
                                    </Pixel.button>
                                    <Pixel.div
                                      v-if="msg.showReasoning"
                                      :class="
                                        css({
                                          marginTop: '2',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '1'
                                        })
                                      "
                                    >
                                      <MpText
                                        v-for="(step, i) in msg.answer.reasoning"
                                        :key="i"
                                        size="label"
                                        color="text.secondary"
                                        :class="css({ display: 'block', fontSize: 'sm' })"
                                        >{{ i + 1 }}. {{ step }}</MpText
                                      >
                                    </Pixel.div>
                                  </Pixel.div>

                                  <Pixel.div :class="bubbleClass">
                                    <MpText
                                      size="body"
                                      color="gray.900"
                                      :class="
                                        css({
                                          display: 'block',
                                          fontWeight: 'bold',
                                          fontSize: 'lg',
                                          marginBottom: '2'
                                        })
                                      "
                                      >{{ msg.answer.title }}</MpText
                                    >
                                    <MpText
                                      size="body"
                                      color="gray.900"
                                      :class="css({ display: 'block' })"
                                      >{{ msg.answer.intro }}</MpText
                                    >

                                    <Pixel.div
                                      v-if="msg.answer.list?.length"
                                      :class="css({ marginTop: '1' })"
                                    >
                                      <MpText
                                        v-for="(item, i) in msg.answer.list"
                                        :key="i"
                                        size="body"
                                        color="gray.900"
                                        :class="css({ display: 'block' })"
                                        >{{ i + 1 }}. {{ item }}</MpText
                                      >
                                    </Pixel.div>

                                    <MpText
                                      v-if="msg.answer.outro"
                                      size="body"
                                      color="gray.900"
                                      :class="css({ display: 'block', marginTop: '1' })"
                                    >
                                      {{ msg.answer.outro }}
                                      <template v-for="(lnk, i) in msg.answer.links || []" :key="i"
                                        ><MpText
                                          as="a"
                                          size="body"
                                          color="blue.400"
                                          :href="lnk.url"
                                          target="_blank"
                                          rel="noopener"
                                          >{{ lnk.label }}</MpText
                                        ><template v-if="i < (msg.answer.links?.length || 0) - 1"
                                          >,
                                        </template></template
                                      >
                                    </MpText>
                                  </Pixel.div>

                                  <!-- Actions -->
                                  <Pixel.div
                                    :class="
                                      css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginTop: '3'
                                      })
                                    "
                                  >
                                    <Pixel.button
                                      :class="sidebarLinkClass"
                                      aria-label="Copy response"
                                    >
                                      <MpIcon name="copy" size="sm" color="blue.400" />
                                      <MpText
                                        size="body"
                                        color="blue.400"
                                        :class="css({ fontWeight: 'medium' })"
                                        >Copy response</MpText
                                      >
                                    </Pixel.button>
                                    <Pixel.div
                                      :class="
                                        css({ display: 'flex', alignItems: 'center', gap: '3' })
                                      "
                                    >
                                      <Pixel.button
                                        aria-label="Good response"
                                        :class="css({ cursor: 'pointer', display: 'flex' })"
                                      >
                                        <MpIcon name="like" size="sm" color="gray.500" />
                                      </Pixel.button>
                                      <Pixel.button
                                        aria-label="Bad response"
                                        :class="css({ cursor: 'pointer', display: 'flex' })"
                                      >
                                        <MpIcon name="dislike" size="sm" color="gray.500" />
                                      </Pixel.button>
                                    </Pixel.div>
                                  </Pixel.div>
                                </Pixel.div>
                              </Transition>
                            </Pixel.div>
                          </template>
                        </Pixel.div>
                      </template>
                    </Pixel.div>
                  </Pixel.div>

                  <!-- Jump to bottom -->
                  <Transition name="airene-jump">
                    <Pixel.button
                      v-if="messages.length && !atBottom"
                      :class="jumpBtnClass"
                      @click="scrollToBottom(true)"
                    >
                      <MpIcon name="arrows-down" size="sm" color="gray.700" />
                      <MpText size="label" color="gray.700" :class="css({ fontSize: 'sm' })"
                        >Jump to bottom</MpText
                      >
                    </Pixel.button>
                  </Transition>
                </Pixel.div>

                <!-- Input (pinned) -->
                <Pixel.div
                  :class="
                    css({ width: 'full', maxWidth: '600px', marginX: 'auto', paddingBottom: '3' })
                  "
                >
                  <Pixel.div :class="[inputBarClass, 'airene-input-bar']">
                    <MpIcon name="text-editor-list" size="md" color="gray.500" />
                    <MpInput
                      id="airene-input"
                      v-model="query"
                      variant="unstyled"
                      placeholder="Search or ask a question..."
                      aria-label="Ask Airene"
                      @keydown.enter="send(query)"
                    />
                    <MpButton
                      variant="primary"
                      is-rounded
                      left-icon="arrows-up"
                      aria-label="Send"
                      @click="send(query)"
                    />
                  </Pixel.div>

                  <MpText
                    size="label"
                    color="gray.500"
                    :class="css({ display: 'block', marginTop: '3', fontSize: 'sm' })"
                  >
                    Airene responses can be inaccurate or misleading.
                    <MpText
                      as="span"
                      size="label"
                      color="blue.400"
                      :class="css({ fontWeight: 'medium', fontSize: 'sm' })"
                      >Learn more</MpText
                    >
                  </MpText>
                </Pixel.div>
              </Pixel.div>
            </Pixel.div>
          </Pixel.div>
        </Transition>
      </Pixel.div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { css, Pixel, MpIcon, MpText, MpButton, MpInput } from "@mekari/pixel3";
import { ref, reactive, watch, nextTick } from "vue";
import { usePixelLayout } from "~/composables/usePixelLayout";
import { resolveAireneAnswer, type AireneAnswer } from "~/data/airene-answers";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { accountInformation } = usePixelLayout();

interface UserMessage {
  id: number;
  role: "user";
  text: string;
}

interface AssistantMessage {
  id: number;
  role: "assistant";
  answer: AireneAnswer;
  showReasoning: boolean;
}

type ChatMessage = UserMessage | AssistantMessage;

const query = ref("");
/** Sidebar starts collapsed by default. */
const collapsed = ref(true);
const messages = reactive<ChatMessage[]>([]);
const threadNode = ref<unknown>(null);
let nextId = 1;

const questions = [
  "How to set approval rules in Jurnal?",
  "What is the top-selling product this month?",
  "What is cash link?"
];

const dateLabel = new Date().toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "short"
});

const atBottom = ref(true);
let suppressScrollCheck = false;

/** `threadNode` is a Pixel.div component ref — reach through to its DOM root. */
function getScrollEl(): HTMLElement | null {
  const node = threadNode.value as unknown as { $el?: HTMLElement } | HTMLElement | null;
  if (!node) return null;
  return (node as { $el?: HTMLElement }).$el ?? (node as HTMLElement);
}

function onThreadScroll() {
  if (suppressScrollCheck) return;
  const el = getScrollEl();
  if (!el) return;
  atBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
}

function scrollToBottom(smooth = false) {
  nextTick(() => {
    const el = getScrollEl();
    if (!el) return;
    suppressScrollCheck = true;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    atBottom.value = true;
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        suppressScrollCheck = false;
      }, 600);
    }
  });
}

/** Simulated send: push the user turn, show Airene "typing", then reveal the reply. */
function send(text: string) {
  const q = text.trim();
  if (!q) return;
  messages.push({ id: nextId++, role: "user", text: q });
  messages.push({
    id: nextId++,
    role: "assistant",
    answer: resolveAireneAnswer(q),
    showReasoning: false
  });
  query.value = "";
  scrollToBottom(true);
}

function resetChat() {
  messages.splice(0, messages.length);
  query.value = "";
}

/** Close on Escape while open. */
function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
}

watch(
  () => props.open,
  (isOpen) => {
    if (typeof window === "undefined") return;
    if (isOpen) window.addEventListener("keydown", onKeydown);
    else window.removeEventListener("keydown", onKeydown);
  }
);

const overlayClass = css({
  position: "fixed",
  top: "0",
  right: "0",
  bottom: "0",
  left: "0",
  zIndex: "modal",
  bg: "overlay",
  display: "flex",
  alignItems: "stretch",
  justifyContent: "center",
  padding: "4"
});

/** Centered modal spanning 10 of 12 grid columns. */
const modalClass = css({
  flexShrink: "0",
  width: "83.3333%",
  display: "flex",
  bg: "white",
  borderRadius: "xl",
  overflow: "hidden",
  boxShadow: "lg"
});

const sidebarBaseClass = css({
  flexShrink: "0",
  display: "flex",
  flexDirection: "column",
  bg: "blue.50",
  transition: "width 200ms ease"
});

const sidebarExpandedClass = css({ width: "236px" });
const sidebarCollapsedClass = css({ width: "68px" });

const mainClass = css({
  flex: "1",
  display: "flex",
  flexDirection: "column",
  minWidth: "0"
});

const bodyClass = css({
  flex: "1",
  display: "flex",
  flexDirection: "column",
  minHeight: "0",
  paddingX: "6"
});

const scrollClass = css({
  flex: "1",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
  minHeight: "0"
});

const newChatClass = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  width: "full",
  paddingX: "3",
  paddingY: "2.5",
  borderRadius: "md",
  bg: "blue.100",
  cursor: "pointer",
  _hover: { bg: "blue.100" }
});

const newChatCollapsedClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2.5",
  borderRadius: "md",
  bg: "blue.100",
  cursor: "pointer"
});

const sidebarLinkClass = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  cursor: "pointer"
});

const questionPillClass = css({
  paddingX: "4",
  paddingY: "2.5",
  borderRadius: "md",
  borderWidth: "sm",
  borderColor: "blue.400",
  bg: "white",
  cursor: "pointer",
  _hover: { bg: "blue.50" }
});

const bubbleClass = css({
  bg: "blue.50",
  borderRadius: "lg",
  padding: "4"
});

const reasoningToggleClass = css({
  display: "inline-flex",
  alignItems: "center",
  cursor: "pointer",
  bg: "transparent",
  _hover: { textDecoration: "underline" }
});

const scrollWrapperClass = css({
  position: "relative",
  flex: "1",
  display: "flex",
  flexDirection: "column",
  minHeight: "0"
});

const jumpBtnClass = css({
  position: "absolute",
  bottom: "3",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: "docked",
  display: "flex",
  alignItems: "center",
  gap: "1.5",
  bg: "white",
  borderWidth: "sm",
  borderColor: "gray.200",
  borderRadius: "var(--border-radius-full)",
  paddingX: "3",
  paddingY: "1.5",
  boxShadow: "md",
  cursor: "pointer",
  _hover: { bg: "gray.50" }
});

const inputBarClass = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  marginTop: "5",
  paddingLeft: "4",
  paddingRight: "2",
  paddingY: "2",
  bg: "white"
});
</script>
