import { LinearGradient } from 'expo-linear-gradient'
import * as WebBrowser from 'expo-web-browser'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { PrimaryButton } from './PrimaryButton'

function getVideoEmbedUrl(video) {
  if (!video) return ''
  if (video.youtubeId) {
    return `https://www.youtube.com/embed/${video.youtubeId}?playsinline=1&rel=0&modestbranding=1`
  }
  return video.url || ''
}

export function MediaViewerModal({ theme, visible, video, onClose }) {
  const sourceUrl = getVideoEmbedUrl(video)

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <LinearGradient colors={theme.gradients.page} style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {video?.title || 'Video'}
              </Text>
              {video?.description ? (
                <Text style={[styles.description, { color: theme.colors.textMuted }]}>
                  {video.description}
                </Text>
              ) : null}
            </View>

            <Pressable
              onPress={onClose}
              style={[
                styles.closeButton,
                {
                  backgroundColor: theme.colors.cardStrong,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.closeText, { color: theme.colors.text }]}>Close</Text>
            </Pressable>
          </View>

          <View
            style={[
              styles.webViewWrap,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            {sourceUrl ? (
              <WebView
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                source={{ uri: sourceUrl }}
                style={styles.webView}
              />
            ) : (
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                  Video URL is not available for this item.
                </Text>
              </View>
            )}
          </View>

          {video?.url ? (
            <PrimaryButton
              onPress={() => WebBrowser.openBrowserAsync(video.url)}
              style={styles.externalButton}
              theme={theme}
              title="Open in browser"
              variant="secondary"
            />
          ) : null}
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  headerText: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  closeButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  closeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  webViewWrap: {
    borderRadius: 28,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 18,
    marginTop: 18,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  externalButton: {
    marginHorizontal: 18,
    marginVertical: 18,
  },
})
