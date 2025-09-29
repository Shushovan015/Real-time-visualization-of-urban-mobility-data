import { useEffect, useRef, useState } from "react";

function debounce(func, timeout = 300) {
  let timer;
  return (arg) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(arg);
    }, timeout);
  };
}

const useDebouncedInput = ({ ms = 300, init, onChange }) => {
  const [input, setInput] = useState(init);
  const [debouncedInput, setDebouncedInput] = useState(init);
  const debounceRef = useRef();

  useEffect(() => {
    debounceRef.current = debounce((val) => {
      setDebouncedInput(val);
      onChange?.(val);
    }, ms);
  }, [ms, onChange]);

  const handleChange = (val) => {
    setInput(val);
    debounceRef.current?.(val);
  };

  useEffect(() => {
    setInput(init);
    setDebouncedInput(init);
  }, [init]);

  return [input, debouncedInput, handleChange];
};

export default useDebouncedInput;
