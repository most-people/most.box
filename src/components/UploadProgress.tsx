"use client";

import {
  Modal,
  Stack,
  Group,
  Text,
  Progress,
  ActionIcon,
  ScrollArea,
  Badge,
  RingProgress,
  ThemeIcon,
  Box,
  Button,
  Tooltip,
  Card,
} from "@mantine/core";
import {
  IconX,
  IconCheck,
  IconFile,
  IconFolder,
  IconRefresh,
  IconTrash,
  IconCloudUpload,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useUploadStore, UploadTask } from "@/stores/uploadStore";
import mp from "@/utils/mp";
import { useMemo } from "react";

const TaskItem = ({
  task,
  isPreview = false,
}: {
  task: UploadTask;
  isPreview?: boolean;
}) => {
  const { cancelTask, retryTask, removeTask } = useUploadStore();

  const statusColor = {
    pending: "gray",
    uploading: "blue",
    success: "green",
    error: "red",
    cancelled: "orange",
    waiting: "yellow",
  }[task.status];

  const statusIcon = {
    pending: <IconCloudUpload size={16} />,
    uploading: <Text size="xs">{task.progress.toFixed(0)}%</Text>,
    success: <IconCheck size={16} />,
    error: <IconX size={16} />,
    cancelled: <IconX size={16} />,
    waiting: <IconFile size={16} />,
  }[task.status];

  return (
    <Box
      p="xs"
      style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
    >
      <Group justify="space-between" mb={5} wrap="nowrap">
        <Group gap="xs" style={{ overflow: "hidden" }} wrap="nowrap">
          <ThemeIcon
            color={task.type === "directory" ? "orange" : "blue"}
            variant="light"
            size="sm"
          >
            {task.type === "directory" ? (
              <IconFolder size={14} />
            ) : (
              <IconFile size={14} />
            )}
          </ThemeIcon>
          <Stack gap={0}>
            <Text size="sm" truncate="end" style={{ maxWidth: 200 }}>
              {task.name}
            </Text>
            {isPreview && task.path && (
              <Text
                size="xs"
                c="dimmed"
                truncate="end"
                style={{ maxWidth: 200 }}
              >
                {task.path}
              </Text>
            )}
          </Stack>
        </Group>
        <Group gap={5}>
          {task.status === "uploading" && (
            <Text size="xs" c="dimmed">
              {mp.formatFileSize(task.speed || 0)}/s
            </Text>
          )}
          {!isPreview && (
            <Badge size="xs" color={statusColor} variant="light">
              {task.status === "uploading"
                ? "上传中"
                : task.status === "success"
                  ? "完成"
                  : task.status === "error"
                    ? "失败"
                    : task.status === "cancelled"
                      ? "取消"
                      : "等待"}
            </Badge>
          )}

          {isPreview ? (
            <ActionIcon
              size="sm"
              color="gray"
              variant="subtle"
              onClick={() => removeTask(task.id)}
            >
              <IconX size={14} />
            </ActionIcon>
          ) : (
            <>
              {(task.status === "uploading" || task.status === "pending") && (
                <ActionIcon
                  size="sm"
                  color="red"
                  variant="subtle"
                  onClick={() => cancelTask(task.id)}
                >
                  <IconX size={14} />
                </ActionIcon>
              )}
              {(task.status === "error" || task.status === "cancelled") &&
                task.file && (
                  <Tooltip label="重试">
                    <ActionIcon
                      size="sm"
                      color="blue"
                      variant="subtle"
                      onClick={() => retryTask(task.id)}
                    >
                      <IconRefresh size={14} />
                    </ActionIcon>
                  </Tooltip>
                )}
            </>
          )}
        </Group>
      </Group>

      {!isPreview && (
        <>
          <Progress
            value={task.progress}
            color={statusColor}
            size="sm"
            animated={task.status === "uploading"}
          />

          <Group justify="space-between" mt={4}>
            <Text size="xs" c="dimmed">
              {mp.formatFileSize(task.uploadedBytes)} /{" "}
              {mp.formatFileSize(task.size)}
            </Text>
            {task.error && (
              <Text size="xs" c="red" truncate="end" style={{ maxWidth: 200 }}>
                {task.error}
              </Text>
            )}
          </Group>
        </>
      )}
      {isPreview && (
        <Text size="xs" c="dimmed">
          {mp.formatFileSize(task.size)}
        </Text>
      )}
    </Box>
  );
};

export default function UploadProgress() {
  const {
    isOpen,
    setIsOpen,
    tasks,
    isUploading,
    cancelAll,
    clearCompleted,
    startUpload,
    removeTask,
  } = useUploadStore();

  const waitingTasks = tasks.filter((t) => t.status === "waiting");
  const activeTasks = tasks.filter((t) => t.status !== "waiting");

  // Show preview if we have waiting tasks and not currently uploading active tasks (unless mixed?)
  // Requirement: "Preview modal" merged. Usually preview happens before upload.
  // If we have waiting tasks, we should probably show them.
  // If we have BOTH waiting and active, it's a bit complex.
  // But typically user selects files -> Preview -> Confirm -> Upload.
  // So if waiting > 0, we are in preview mode for those files.
  // We can just show waiting tasks if any.

  const isPreviewMode = waitingTasks.length > 0;

  const displayTasks = isPreviewMode ? waitingTasks : activeTasks;

  const { totalProgress, totalSize, uploadedSize, remainingTime } =
    useMemo(() => {
      if (activeTasks.length === 0)
        return {
          totalProgress: 0,
          totalSize: 0,
          uploadedSize: 0,
          remainingTime: null,
        };

      const totalSize = activeTasks.reduce((acc, t) => acc + t.size, 0);
      const uploadedSize = activeTasks.reduce(
        (acc, t) => acc + t.uploadedBytes,
        0,
      );
      const totalProgress =
        totalSize > 0 ? (uploadedSize / totalSize) * 100 : 0;

      // Estimate time
      const uploadingTasks = activeTasks.filter(
        (t) => t.status === "uploading",
      );
      const totalSpeed = uploadingTasks.reduce(
        (acc, t) => acc + (t.speed || 0),
        0,
      );
      const remainingBytes = totalSize - uploadedSize;
      const remainingTime = totalSpeed > 0 ? remainingBytes / totalSpeed : null;

      return { totalProgress, totalSize, uploadedSize, remainingTime };
    }, [activeTasks]);

  const handleClose = () => {
    if (isUploading) {
      return;
    }
    // If in preview mode, closing means cancelling the preview
    if (isPreviewMode) {
      waitingTasks.forEach((t) => removeTask(t.id));
    }
    setIsOpen(false);
    clearCompleted();
  };

  const handleConfirm = () => {
    startUpload();
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null || !isFinite(seconds)) return "--";
    if (seconds < 60) return `${Math.ceil(seconds)}秒`;
    const mins = Math.ceil(seconds / 60);
    return `${mins}分钟`;
  };

  // Preview stats
  const previewTotalSize = useMemo(() => {
    return waitingTasks.reduce((acc, t) => acc + t.size, 0);
  }, [waitingTasks]);

  return (
    <Modal
      opened={isOpen}
      onClose={() => {
        if (!isUploading) handleClose();
      }}
      title={
        <Group>
          <Text fw={700}>{isPreviewMode ? "文件预览" : "文件上传"}</Text>
          {!isPreviewMode && isUploading && (
            <Badge color="blue" variant="dot">
              进行中
            </Badge>
          )}
        </Group>
      }
      closeOnClickOutside={!isUploading}
      withCloseButton={!isUploading}
      size="lg"
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
      closeOnEscape={!isUploading}
    >
      <Stack gap="md">
        {/* Overall Status - Only show in progress mode */}
        {!isPreviewMode && activeTasks.length > 0 && (
          <Card withBorder padding="sm" radius="md">
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={500}>
                总进度 (
                {activeTasks.filter((t) => t.status === "success").length}/
                {activeTasks.length})
              </Text>
              <Text size="sm" c="dimmed">
                {mp.formatFileSize(uploadedSize)} /{" "}
                {mp.formatFileSize(totalSize)}
              </Text>
            </Group>
            <Progress
              value={totalProgress}
              size="xl"
              radius="xl"
              animated={isUploading}
              // label={`${totalProgress.toFixed(1)}%`}
            />
            {isUploading && (
              <Group justify="end" mt="xs">
                <Text size="xs" c="dimmed">
                  预计剩余时间: {formatTime(remainingTime)}
                </Text>
              </Group>
            )}
          </Card>
        )}

        {/* Preview Summary */}
        {isPreviewMode && (
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              共 {waitingTasks.length} 个文件，总大小:{" "}
              {mp.formatFileSize(previewTotalSize)}
            </Text>
          </Group>
        )}

        {/* Task List */}
        <Text size="sm" fw={500} mt="sm">
          详细列表
        </Text>
        <ScrollArea h={300} type="always" offsetScrollbars>
          <Stack gap={0}>
            {displayTasks.map((task) => (
              <TaskItem key={task.id} task={task} isPreview={isPreviewMode} />
            ))}
          </Stack>
        </ScrollArea>

        {/* Actions */}
        <Group justify="right">
          {isPreviewMode ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button
                onClick={handleConfirm}
                leftSection={<IconPlayerPlay size={16} />}
              >
                确认上传
              </Button>
            </>
          ) : (
            <>
              {isUploading ? (
                <Button
                  color="red"
                  variant="light"
                  onClick={cancelAll}
                  leftSection={<IconX size={16} />}
                >
                  取消所有
                </Button>
              ) : (
                <Button onClick={handleClose}>关闭</Button>
              )}
            </>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
