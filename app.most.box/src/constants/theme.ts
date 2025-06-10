import { createTheme, MantineColorsTuple } from "@mantine/core";

// https://mantine.dev/colors-generator/?color=862e2a
const mostColor: MantineColorsTuple = [
  "#faf0ef",
  "#eededd",
  "#dfb8b6",
  "#d2908d",
  "#c76f6a",
  "#c15a54",
  "#be4f48",
  "#a8403a",
  "#963832",
  "#842d29",
];

export const theme = createTheme({
  primaryColor: "mostColor",
  colors: { mostColor },
  fontFamily: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji",
    "Segoe UI Symbol"`,
  defaultGradient: {
    from: "orange",
    to: "red",
    deg: 45,
  },
  components: {
    Input: {
      defaultProps: {
        size: "md",
      },
    },
    TextInput: {
      defaultProps: {
        size: "md",
      },
    },
    Textarea: {
      defaultProps: {
        size: "md",
      },
    },
    Button: {
      defaultProps: {
        fw: 400,
        size: "md",
      },
    },
    Notification: {
      defaultProps: {
        color: "gray",
      },
    },
  },
});
