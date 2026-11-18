import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';

export const getConversations = async (req, res, next) => {
  try {
    if (req.user.role === 'patient') {
      if (!req.patientProfile) {
        return res.status(404).json({ success: false, message: 'Patient profile not found.' });
      }

      const patient = await Patient.findById(req.patientProfile._id).populate({
        path: 'assignedDoctor',
        populate: { path: 'user', select: 'name email phone' },
      });

      if (!patient || !patient.assignedDoctor || !patient.assignedDoctor.isActive) {
        return res.status(200).json({
          success: true,
          assigned: false,
          doctor: null,
          conversation: null,
          unreadTotal: 0,
          message:
            'No primary doctor is currently assigned to your account. Private messaging is available only once an authorized physician is assigned to you.',
        });
      }

      const conversation = await Conversation.findOne({
        patient: patient._id,
        doctor: patient.assignedDoctor._id,
      }).populate({
        path: 'doctor',
        populate: { path: 'user', select: 'name email phone' },
      });

      return res.status(200).json({
        success: true,
        assigned: true,
        doctor: patient.assignedDoctor,
        conversation,
        unreadTotal: conversation?.unreadForPatient || 0,
      });
    }

    if (req.user.role === 'doctor') {
      if (!req.doctorProfile) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
      }

      const assignedPatients = await Patient.find({
        assignedDoctor: req.doctorProfile._id,
        isArchived: false,
      })
        .populate('user', 'name email phone')
        .sort({ updatedAt: -1 });

      const assignedIds = assignedPatients.map((p) => p._id);

      const conversations = await Conversation.find({
        doctor: req.doctorProfile._id,
        patient: { $in: assignedIds },
      })
        .populate({
          path: 'patient',
          populate: { path: 'user', select: 'name email phone' },
        })
        .sort({ lastMessageAt: -1, updatedAt: -1 });

      const convByPatient = new Map(
        conversations.map((c) => [String(c.patient?._id || c.patient), c])
      );

      const threads = assignedPatients.map((pat) => {
        const conv = convByPatient.get(String(pat._id)) || null;
        return {
          patient: pat,
          conversationId: conv?._id || null,
          lastMessageText: conv?.lastMessageText || '',
          lastMessageAt: conv?.lastMessageAt || null,
          lastSenderRole: conv?.lastSenderRole || '',
          unreadCount: conv?.unreadForDoctor || 0,
        };
      });

      threads.sort((a, b) => {
        if (a.lastMessageAt && b.lastMessageAt) {
          return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
        }
        if (a.lastMessageAt) return -1;
        if (b.lastMessageAt) return 1;
        return (a.patient?.user?.name || '').localeCompare(b.patient?.user?.name || '');
      });

      const unreadTotal = threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);

      return res.status(200).json({
        success: true,
        threads,
        unreadTotal,
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Private clinical messaging is restricted to patients and their assigned doctors.',
    });
  } catch (error) {
    return next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    let conversation = null;

    if (req.user.role === 'patient') {
      if (!req.patientProfile) {
        return res.status(404).json({ success: false, message: 'Patient profile not found.' });
      }
      const patient = await Patient.findById(req.patientProfile._id);
      if (!patient?.assignedDoctor) {
        return res.status(403).json({
          success: false,
          message: 'No doctor is currently assigned to your account.',
        });
      }

      if (req.params.conversationId === 'assigned') {
        conversation = await Conversation.findOne({
          patient: patient._id,
          doctor: patient.assignedDoctor,
        });
      } else {
        if (!mongoose.isValidObjectId(req.params.conversationId)) {
          return res.status(400).json({ success: false, message: 'Invalid conversation ID.' });
        }
        conversation = await Conversation.findById(req.params.conversationId);
        if (!conversation) {
          return res.status(404).json({ success: false, message: 'Conversation not found.' });
        }
        if (
          String(conversation.patient) !== String(patient._id) ||
          String(conversation.doctor) !== String(patient.assignedDoctor)
        ) {
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to access this conversation.',
          });
        }
      }

      if (!conversation) {
        return res.status(200).json({
          success: true,
          conversation: null,
          messages: [],
        });
      }

      await Message.updateMany(
        { conversation: conversation._id, senderRole: 'doctor', isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );
      if (conversation.unreadForPatient > 0) {
        conversation.unreadForPatient = 0;
        await conversation.save();
      }
    } else if (req.user.role === 'doctor') {
      if (!req.doctorProfile) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
      }

      const { patientId } = req.query;
      if (req.params.conversationId === 'by-patient') {
        if (!patientId || !mongoose.isValidObjectId(patientId)) {
          return res.status(400).json({ success: false, message: 'Valid patientId is required.' });
        }
        const assignedPatient = await Patient.findOne({
          _id: patientId,
          assignedDoctor: req.doctorProfile._id,
          isArchived: false,
        });
        if (!assignedPatient) {
          return res.status(403).json({
            success: false,
            message: 'You can only view conversations with patients assigned to your care.',
          });
        }
        conversation = await Conversation.findOne({
          patient: assignedPatient._id,
          doctor: req.doctorProfile._id,
        });
      } else {
        if (!mongoose.isValidObjectId(req.params.conversationId)) {
          return res.status(400).json({ success: false, message: 'Invalid conversation ID.' });
        }
        conversation = await Conversation.findById(req.params.conversationId);
        if (!conversation) {
          return res.status(404).json({ success: false, message: 'Conversation not found.' });
        }
        if (String(conversation.doctor) !== String(req.doctorProfile._id)) {
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to access this conversation.',
          });
        }
        const stillAssigned = await Patient.exists({
          _id: conversation.patient,
          assignedDoctor: req.doctorProfile._id,
          isArchived: false,
        });
        if (!stillAssigned) {
          return res.status(403).json({
            success: false,
            message: 'This patient is no longer assigned to your care.',
          });
        }
      }

      if (!conversation) {
        return res.status(200).json({
          success: true,
          conversation: null,
          messages: [],
        });
      }

      await Message.updateMany(
        { conversation: conversation._id, senderRole: 'patient', isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );
      if (conversation.unreadForDoctor > 0) {
        conversation.unreadForDoctor = 0;
        await conversation.save();
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Administrators do not have access to private clinical messages.',
      });
    }

    const messages = await Message.find({ conversation: conversation._id })
      .populate('senderUser', 'name role')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      conversation,
      messages,
    });
  } catch (error) {
    return next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const trimmedContent = String(req.body.content || '').trim();
    if (!trimmedContent) {
      return res.status(400).json({
        success: false,
        message: 'Message text cannot be empty.',
      });
    }
    if (trimmedContent.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot exceed 2000 characters.',
      });
    }

    let patientDoc = null;
    let doctorDoc = null;

    if (req.user.role === 'patient') {
      if (!req.patientProfile) {
        return res.status(404).json({ success: false, message: 'Patient profile not found.' });
      }
      patientDoc = await Patient.findById(req.patientProfile._id);
      if (!patientDoc || !patientDoc.assignedDoctor) {
        return res.status(403).json({
          success: false,
          message: 'You cannot send messages until a primary doctor is assigned to your account.',
        });
      }
      doctorDoc = await Doctor.findById(patientDoc.assignedDoctor);
      if (!doctorDoc || !doctorDoc.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your assigned doctor is currently unavailable.',
        });
      }
    } else if (req.user.role === 'doctor') {
      if (!req.doctorProfile) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
      }
      const { patientId } = req.body;
      if (!patientId || !mongoose.isValidObjectId(patientId)) {
        return res.status(400).json({
          success: false,
          message: 'Please select an assigned patient to message.',
        });
      }
      patientDoc = await Patient.findOne({
        _id: patientId,
        assignedDoctor: req.doctorProfile._id,
        isArchived: false,
      });
      if (!patientDoc) {
        return res.status(403).json({
          success: false,
          message: 'You can only send messages to patients assigned to your care.',
        });
      }
      doctorDoc = req.doctorProfile;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Administrators cannot participate in private patient–doctor messaging.',
      });
    }

    let conversation = await Conversation.findOne({
      patient: patientDoc._id,
      doctor: doctorDoc._id,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        patient: patientDoc._id,
        doctor: doctorDoc._id,
      });
    }

    const message = await Message.create({
      conversation: conversation._id,
      senderUser: req.user._id,
      senderRole: req.user.role,
      content: trimmedContent,
      isRead: false,
    });

    const preview = trimmedContent.length > 140 ? `${trimmedContent.slice(0, 137)}...` : trimmedContent;
    conversation.lastMessageText = preview;
    conversation.lastMessageAt = message.createdAt;
    conversation.lastSenderRole = req.user.role;
    if (req.user.role === 'patient') {
      conversation.unreadForDoctor = (conversation.unreadForDoctor || 0) + 1;
    } else {
      conversation.unreadForPatient = (conversation.unreadForPatient || 0) + 1;
    }
    await conversation.save();

    const populatedMessage = await Message.findById(message._id).populate('senderUser', 'name role');

    return res.status(201).json({
      success: true,
      conversation,
      message: populatedMessage,
    });
  } catch (error) {
    return next(error);
  }
};

export const getUnreadChatCount = async (req, res, next) => {
  try {
    if (req.user.role === 'patient') {
      if (!req.patientProfile || !req.patientProfile.assignedDoctor) {
        return res.status(200).json({ success: true, unreadCount: 0 });
      }
      const conv = await Conversation.findOne({
        patient: req.patientProfile._id,
        doctor: req.patientProfile.assignedDoctor,
      }).select('unreadForPatient');
      return res.status(200).json({
        success: true,
        unreadCount: conv?.unreadForPatient || 0,
      });
    }

    if (req.user.role === 'doctor') {
      if (!req.doctorProfile) {
        return res.status(200).json({ success: true, unreadCount: 0 });
      }
      const assignedIds = await Patient.distinct('_id', {
        assignedDoctor: req.doctorProfile._id,
        isArchived: false,
      });
      const convs = await Conversation.find({
        doctor: req.doctorProfile._id,
        patient: { $in: assignedIds },
      }).select('unreadForDoctor');
      const unreadCount = convs.reduce((sum, c) => sum + (c.unreadForDoctor || 0), 0);
      return res.status(200).json({ success: true, unreadCount });
    }

    return res.status(403).json({
      success: false,
      message: 'Private chat counts are unavailable for admin accounts.',
    });
  } catch (error) {
    return next(error);
  }
};
