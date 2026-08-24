import Editor from "@monaco-editor/react";

type Props = {
  language: string;
  value: string;
};

function CodeEditor({
  language,
  value,
}: Props) {
  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      theme="vs-dark"
      options={{
        readOnly: true,
        minimap: {
          enabled: true,
        },
        fontSize: 14,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: "on",
        renderWhitespace: "selection",
        smoothScrolling: true,
        tabSize: 2,
        padding: {
          top: 12,
          bottom: 12,
        },
      }}
    />
  );
}

export default CodeEditor;