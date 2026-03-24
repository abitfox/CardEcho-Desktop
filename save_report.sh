#!/bin/bash
# Qwen Code 对话总结导出脚本
# 使用方法：./save_report.sh "总结内容"

SUMMARY_DIR="/Users/jack/Desktop/note/Qwen"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="$SUMMARY_DIR/report_$TIMESTAMP.md"

mkdir -p "$SUMMARY_DIR"

if [ -n "$1" ]; then
    echo "$1" > "$OUTPUT_FILE"
    echo "✅ 总结已保存到：$OUTPUT_FILE"
else
    echo "用法：$0 \"总结内容\""
    echo "或直接在 Qwen Code 中说：请将总结保存到 /Users/jack/Desktop/note/Qwen/"
fi
