import React, { Component } from "react";
import PropTypes from "prop-types";

import { PanResponder, View, Platform } from "react-native";

// Utils
import { angle, distance } from "./utils/math.js";
import {
  getAngle,
  getScale,
  getTouches,
  isMultiTouch,
} from "./utils/events.js";

export default class Gestures extends Component {
  static propTypes = {
    children: PropTypes.element,
    // Behavior
    draggable: PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.shape({
        x: PropTypes.bool,
        y: PropTypes.bool,
      }),
    ]),
    rotatable: PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.shape({
        step: PropTypes.number,
      }),
    ]),
    scalable: PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.shape({
        min: PropTypes.number,
        max: PropTypes.number,
      }),
    ]),
    // Static control value
    scale: PropTypes.number,
    rotate: PropTypes.string,
    // Styles
    style: PropTypes.object,
    // Callbacks
    onStart: PropTypes.func,
    onChange: PropTypes.func,
    onEnd: PropTypes.func,
    onMultyTouchStart: PropTypes.func,
    onMultyTouchChange: PropTypes.func,
    onMultyTouchEnd: PropTypes.func,
    onRelease: PropTypes.func, // Legacy
    onRotateStart: PropTypes.func,
    onRotateChange: PropTypes.func,
    onRotateEnd: PropTypes.func,
    onScaleStart: PropTypes.func,
    onScaleChange: PropTypes.func,
    onScaleEnd: PropTypes.func,
  };

  static defaultProps = {
    children: {},
    // Behavior
    draggable: true || {
      x: true,
      y: false,
    },
    rotatable: true || {
      step: 90,
    },
    scalable: true || {
      min: 0.33,
      max: 2,
    },
    // Styles
    style: {
      left: 0,
      top: 0,
      transform: [{ rotate: "0deg" }, { scale: 1 }],
    },
    // Callbacks
    onStart: () => { },
    onChange: () => { },
    onEnd: () => { },
    onRelease: () => { }, // Legacy

    // New callbacks
    onMultyTouchStart: () => { },
    onMultyTouchChange: () => { },
    onMultyTouchEnd: () => { },
    onRotateStart: () => { },
    onRotateChange: () => { },
    onRotateEnd: () => { },
    onScaleStart: () => { },
    onScaleChange: () => { },
    onScaleEnd: () => { },
  };

  constructor(props) {
    super(props);

    const style = {
      ...Gestures.defaultProps.style,
      ...this.props.style,
    };

    const styles = {
      ...style,
      transform: [
        { rotate: props.rotate ? props.rotate : props.style.rotate | "0deg" },
        { scale: props.scale ? props.scale : props.style.scale | 1 },
      ],
      top: props.rotate === "180deg" && style.height ? style.height : style.top,
      left: props.rotate === "90deg" && style.width ? style.width : style.left,
    };

    this.state = {
      isMultyTouchingNow: false,
      isRotatingNow: false,
      isScalingNow: false,

      style: styles,
    };

    // this.state = {
    //   isMultyTouchingNow: false,
    //   isRotatingNow: false,
    //   isScalingNow: false,

    //   style: {
    //     ...Gestures.defaultProps.style,
    //     ...this.props.style,
    //   },
    // };

    this.pan = PanResponder.create({
      onPanResponderGrant: this.onMoveStart,
      onPanResponderMove: this.onMove,
      onPanResponderEnd: this.onMoveEnd,

      onPanResponderTerminate: () => true,
      onShouldBlockNativeResponder: () => true,
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => true,
      onMoveShouldSetPanResponderCapture: (event, { dx, dy }) =>
        Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5,
      onMoveShouldSetPanResponder: (event, { dx, dy }) =>
        Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5,
    });
  }

  // componentWillReceiveProps(nextProps) {
  //   this.updateProps(nextProps);
  // }

  shouldComponentUpdate (nextProps, nextState) {
    //problem : is there's no props from component, error will happened
    if (
      nextProps.rotate !== this.props.rotate ||
      nextProps.scale !== this.props.scale
    ) {
      this.updateProps(nextProps);
    }

    return true;
  }

  componentDidMount () {
    const { style } = this.state;

    this.prevStyles = style;
  }

  onDrag (event, gestureState) {
    const { initialStyles } = this;
    const { draggable } = this.props;

    const isObject = draggable === Object(draggable);

    const left = (isObject ? draggable.x : draggable)
      ? initialStyles.left + gestureState.dx
      : initialStyles.left;

    const top = (isObject ? draggable.y : draggable)
      ? initialStyles.top + gestureState.dy
      : initialStyles.top;

    this.dragStyles = { left, top };
  }

  onRotate = (event) => {
    const { onRotateStart, onRotateChange, rotatable } = this.props;
    const { isRotatingNow, style } = this.state;

    const { initialTouches } = this;

    if (rotatable === Object(rotatable) || rotatable) {
      const currentAngle = angle(getTouches(event));
      const initialAngle =
        initialTouches.length > 1 ? angle(initialTouches) : currentAngle;
      const newAngle = currentAngle - initialAngle;
      const diffAngle = this.prevAngle - newAngle;

      this.pinchStyles.transform.push({
        rotate: getAngle(event, style, diffAngle),
      });

      this.prevAngle = newAngle;

      if (!isRotatingNow) {
        onRotateStart(event, style);

        this.setState({ isRotatingNow: true });
      } else {
        onRotateChange(event, style);
      }
    }
  };

  onScale = (event) => {
    const { onScaleStart, onScaleChange, scalable } = this.props;
    const { isScalingNow, style } = this.state;
    const { initialTouches } = this;

    const isObject = scalable === Object(scalable);

    if (isObject || scalable) {
      const currentDistance = distance(getTouches(event));
      const initialDistance = distance(initialTouches);
      const increasedDistance = currentDistance - initialDistance;
      const diffDistance = this.prevDistance - (increasedDistance * 1.8);

      const min = isObject ? scalable.min : 0.33;
      const max = isObject ? scalable.max : 2;
      const scale = Math.min(
        Math.max(getScale(event, style, diffDistance), min),
        max
      );

      this.pinchStyles.transform.push({ scale });
      this.prevDistance = increasedDistance;

      if (!isScalingNow) {
        onScaleStart(event, style);

        this.setState({ isScalingNow: true });
      } else {
        onScaleChange(event, style);
      }
    }
  };

  onMoveStart = (event) => {
    const { style } = this.state;
    const { onMultyTouchStart, onStart } = this.props;

    const touches = getTouches(event);

    this.prevAngle = 0;
    this.prevDistance = 0;
    this.initialTouchesAngle = 0;
    this.pinchStyles = {};
    this.dragStyles = {};
    this.prevStyles = style;

    this.initialTouches = getTouches(event);
    this.initialStyles = style;

    onStart(event, style);

    if (touches.length > 1) {
      onMultyTouchStart(event, style);

      this.setState({ isMultyTouchingNow: true });
    }
  };

  onMove = (event, gestureState) => {
    const { isMultyTouchingNow, style } = this.state;
    const { onChange, onMultyTouchChange } = this.props;

    const { initialTouches } = this;

    const touches = getTouches(event);

    if (touches.length !== initialTouches.length) {
      this.initialTouches = touches;
    } else {
      this.onDrag(event, gestureState);
      this.onPinch(event);
    }

    if (isMultyTouchingNow) {
      onMultyTouchChange(event, style);
    }

    this.updateStyles();

    onChange(event, style);
  };

  onMoveEnd = (event) => {
    const {
      isMultyTouchingNow,
      isRotatingNow,
      isScalingNow,
      style,
    } = this.state;
    const {
      onEnd,
      onMultyTouchEnd,
      onRelease, // Legacy
      onRotateEnd,
      onScaleEnd,
      rotatable,
    } = this.props;

    onEnd(event, style);
    onRelease(event, style); // Legacy

    if (isRotatingNow) {
      if (rotatable === Object(rotatable)) {
        const endAngle = parseFloat(getAngle(event, style, 0));
        const snapAngle =
          Math.round(endAngle / rotatable.step) * rotatable.step;
        const diffAngle = endAngle - snapAngle;
        this.pinchStyles.transform = [
          { rotate: getAngle(event, style, diffAngle) },
          this.pinchStyles.transform.find((x) => x.scale) ??
          Gestures.defaultProps.style.transform.find((x) => x.scale),
        ];
      }
      this.updateStyles();
      onRotateEnd(event, style);
    }

    if (isScalingNow) {
      onScaleEnd(event, style);
    }

    if (isMultyTouchingNow) {
      onMultyTouchEnd(event, style);
    }

    this.setState({
      isRotatingNow: false,
      isScalingNow: false,
    });
  };

  onPinch = (event) => {
    if (isMultiTouch(event)) {
      this.pinchStyles = { transform: [] };

      this.onScale(event);
      this.onRotate(event);
    }
  };

  updateStyles = () => {
    const style = {
      ...this.state.style,
      ...this.dragStyles,
      ...this.pinchStyles,
    };

    this.updateNativeStyles(style);
    this.setState({ style });
  };

  updateProps = (nextProps) => {
    const rotate = this.state.style.transform[0].rotate;
    const scale = this.state.style.transform[1].scale;

    const safeStyle = {
      ...this.state.style,
      transform: [
        { rotate: rotate ? rotate : "0deg" },
        { scale: scale ? scale : 1 },
      ],
    };

    if (
      nextProps.rotate !== this.props.rotate &&
      nextProps.rotate !== safeStyle.transform.find((t) => t.rotate).rotate
    ) {
      this.setState((prevState) => ({
        style: {
          ...prevState.style,
          transform: prevState.style.transform.map((t) =>
            t.rotate ? { rotate: nextProps.rotate } : t
          ),
        },
      }));
    }

    if (
      nextProps.scale !== this.props.scale &&
      nextProps.scale !== safeStyle.transform.find((t) => t.scale).scale
    ) {
      this.setState((prevState) => ({
        style: {
          ...prevState.style,
          transform: prevState.style.transform.map((t) =>
            t.scale ? { scale: nextProps.scale } : t
          ),
        },
      }));
    }
  };

  updateNativeStyles = (style) => {
    this.view.setNativeProps({ style });
  };

  // updateProps = nextProps => {
  //   this.setState( prevState => ({
  //     styles: {
  //       ...prevState.styles,
  //       ...nextProps.styles
  //     }
  //   }));
  // };

  reset = (callback) => {
    const { left, top, transform } = this.prevStyles;

    this.dragStyles = { left, top };
    this.pinchStyles = { transform };

    this.updateStyles();

    callback(this.prevStyles);
  };

  render () {
    const { style } = this.state;
    const { children } = this.props;

    return (
      <View
        ref={(c) => {
          this.view = c;
        }}
        style={style}
        {...this.pan.panHandlers}
      >
        {children}
      </View>
    );
  }
}
