import React, { PropTypes } from 'react';
import PureComponent from 'react-pure-render/component';

export class Tag extends PureComponent {
    render() {
        const props = this.props;

        const key = typeof props.children === 'string'
            ? props.children
            : props.children.toString();

        return (
            <span>
                <span className="label label-primary"
                      onClick={props.onClick}
                      key={key}>
                      {props.children}&nbsp;
                      <span className="glyphicon glyphicon-remove" aria-hidden="true"></span>
                </span>&nbsp;
            </span>
        );
    }
}

Tag.propTypes = {
    onClick: PropTypes.func.isRequired,
    children: PropTypes.node.isRequired,
};

export class TextSubmitter extends PureComponent {
    render() {
        const props = this.props;
        let inputRef;

        const onClick = () => props.onSubmit(inputRef.value);

        return (
            <div className="form-inline">
                <div className="form-group">
                    <input className="form-control" type="text" ref={el => inputRef = el}/>
                    <button className="btn btn-default" onClick={onClick}>Add Tag</button>
                </div>
            </div>
        );
    }
}

TextSubmitter.propTypes = {
    text: PropTypes.string.isRequired,
    onSubmit: PropTypes.func.isRequired,
};

export class TodoItem extends PureComponent {
    render() {
        const props = this.props;
        const tags = props.tags.map(tagName => {
            return (
                <Tag key={tagName} onClick={props.onRemoveTag.bind(null, tagName)}>
                    {tagName}
                </Tag>
            );
        });

        const text = props.done
            ? <del>{props.children}</del>
            : <strong>{props.children}</strong>;

        let listItemClasses = 'list-group-item';

        if (props.done) listItemClasses += ' disabled';

        const markDoneButton = props.done
            ? null
            : <button className="btn btn-primary" onClick={props.onMarkDone}>Mark done</button>;

        const addTagForm = <TextSubmitter onSubmit={props.onAddTag} text="Add Tag"/>;

        return (
            <li className={listItemClasses}>
                <div className="row">
                    <div className="col-md-8">
                        <h4 className="list-group-item-heading">{text} {tags}</h4>
                    </div>
                    <div className="col-md-4 text-right">
                        <p>
                            {markDoneButton}&nbsp;
                            <button className="btn btn-danger"
                                    onClick={props.onDelete}>
                                Delete
                            </button>
                        </p>
                        {addTagForm}
                    </div>
                </div>
            </li>
        );
    }
}

TodoItem.propTypes = {
    children: PropTypes.string.isRequired,
    tags: PropTypes.arrayOf(PropTypes.string).isRequired,
    done: PropTypes.bool.isRequired,
    onAddTag: PropTypes.func.isRequired,
    onRemoveTag: PropTypes.func.isRequired,
    onMarkDone: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
};

export class AddTodoForm extends PureComponent {
    render() {
        const props = this.props;
        let textRef;
        let tagsRef;

        const onSubmit = () => {
            props.onSubmit({
                text: textRef.value,
                tags: tagsRef.value,
            });
        };

        return (
            <div>
                <div className="form-group">
                    <label>Name</label>&nbsp;
                    <input className="form-control"
                           type="text"
                           ref={el => textRef = el}
                           placeholder="Todo Name"/>
                    &nbsp;
                </div>
                <div className="form-group">
                    <label>Tags</label>&nbsp;
                    <input className="form-control"
                           type="text"
                           ref={el => tagsRef = el}
                           placeholder="urgent, personal, work"/>
                    &nbsp;
                </div>
                <button className="btn btn-primary" onClick={onSubmit}>Add Todo</button>
            </div>
        );
    }
}

AddTodoForm.propTypes = {
    onSubmit: PropTypes.func.isRequired,
};

export class UserSelector extends PureComponent {
    render() {
        const props = this.props;
        let selectRef;

        const onChange = () => {
            const integerId = parseInt(selectRef.value, 10);
            props.onSelect(integerId);
        };

        return (
            <div className="form-group">
                <label>User</label>
                <select className="form-control"
                        onChange={onChange}
                        ref={el => selectRef = el}>
                    {props.children}
                </select>
            </div>
        );
    }
}

UserSelector.propTypes = {
    onSelect: PropTypes.func.isRequired,
    children: PropTypes.arrayOf(PropTypes.element).isRequired,
};
