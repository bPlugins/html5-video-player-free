import { Icon, ToggleControl, Tooltip } from "@wordpress/components";

interface BToggleControlProps {
  info?: string;
  label?: string;
  className?: string;
  onChange?: (val: any) => void;
  Component?: React.ElementType;
  [key: string]: any;
}

const BToggleControl = ({ info = "", label = "", isNew = false, className = "", onChange = () => { }, Component = ToggleControl, ...restProps }: BToggleControlProps) => {
  return (
    <div className={`mt5 bToggleControl ${className}`}>
      <Component
        className={className}
        label={<Label info={info} label={label} isNew={isNew} />}
        onChange={onChange}
        {...restProps}
      />
    </div>
  );
};

export default BToggleControl;

interface LabelProps {
  info?: string;
  label?: string;
  isNew?: boolean;
}

export const NewBadge = () => <span className="h5vp-new-badge">New</span>;

export const Label = ({ info = "", label = "", isNew = false }: LabelProps) => {
  return (
    <>
      {label && <span style={{ marginRight: "5px" }}>{label}</span>}
      {isNew && <NewBadge />}
      {info && (
        <Tooltip text={info} placement="top">
          <Icon icon="info-outline" size={17} />
        </Tooltip>
      )}
    </>
  );
};
