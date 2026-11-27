import AsyncSelect from "react-select/async";

export const MyAsyncSelect: AsyncSelect = (props) => {
  return <AsyncSelect
    closeMenuOnSelect={true}
    blurInputOnSelect={true}
    maxMenuHeight={1/0}
    {...props}
    theme={(theme: any) => ((props.theme as any) ?? ((x: any) => x))({
      ...theme,
      colors: {
        ...theme.colors,
        primary25: "var(--button-tint)", // menu hovered
        primary: "var(--primary)", // menu selected

        neutral0: "var(--box-tint)", // background
        neutral20: "var(--stroke)",
        neutral80: "var(--body-fg)", // normal text
      }
    })}
  />
}
